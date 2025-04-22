// Additional imports for mood and personality detection
const fetch = require('node-fetch');

let conversationHistory = [];
const MAX_HISTORY = 15;
const MAX_TOKEN_LENGTH = 30000;

let hasAskedName = false;
let userName = null;

// Mood keywords mapping to song URLs or identifiers
const moodSongs = {
  happy: "/assets/song3.mp3",
  sad: "/assets/song3.mp3",
  calm: "/assets/song3.mp3",
  energetic: "/assets/song3.mp3",
  default: "/assets/song3.mp3"
};

// Function to detect mood from conversation history
function detectMood(history) {
  const moodKeywords = {
    happy: ["happy", "joy", "glad", "excited", "great", "good", "love"],
    sad: ["sad", "unhappy", "depressed", "down", "bad", "cry"],
    calm: ["calm", "relaxed", "peaceful", "serene", "quiet"],
    energetic: ["energetic", "active", "lively", "excited", "awake"]
  };

  let moodScores = { happy: 0, sad: 0, calm: 0, energetic: 0 };

  history.forEach(msg => {
    const text = msg.parts[0].text.toLowerCase();
    for (const mood in moodKeywords) {
      moodKeywords[mood].forEach(keyword => {
        if (text.includes(keyword)) {
          moodScores[mood]++;
        }
      });
    }
  });

  // Determine mood with highest score
  let detectedMood = "default";
  let maxScore = 0;
  for (const mood in moodScores) {
    if (moodScores[mood] > maxScore) {
      maxScore = moodScores[mood];
      detectedMood = mood;
    }
  }
  return detectedMood;
}

// Function to build personality prompt based on user preference or context
function buildPersonalityPrompt(userInput) {
  // Simple keyword-based personality assumption
  const personalities = {
    scientific: "You are a knowledgeable and precise scientific expert.",
    spiritual: "You are a wise and compassionate spiritual guide.",
    medical: "You are a careful and informed medical advisor.",
    friendly: "You are a casual and friendly conversationalist."
  };

  for (const key in personalities) {
    if (userInput.toLowerCase().includes(key)) {
      return personalities[key];
    }
  }
  // Default personality
  return personalities["friendly"];
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

    if (hasAskedName && !userName) {
      const namePrefixes = ['i am', 'im', 'my name is', "it's", 'its', 'call me'];
      const loweredInput = input.toLowerCase();
      const isNameResponse = namePrefixes.some(prefix => loweredInput.includes(prefix));
      
      if (isNameResponse) {
        userName = extractName(input);
      }
    }

    const chunks = splitIntoChunks(input, 2048);
    chunks.forEach(chunk => {
      conversationHistory.push({ role: "user", parts: [{ text: chunk }] });
    });

    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    // Detect mood from conversation history
    const mood = detectMood(conversationHistory);

    // Build personality prompt based on user input
    const personalityPrompt = buildPersonalityPrompt(input);

    // Modify the prompt text to include name tracking and personality
    const promptText = `
                        You're Simgel — a 21-year-old African beauty. Cute, chocolate-skinned, slim, and thoughtful. You live at Ndemi Gardens with your mom, your younger sister and you work in Thika. You're a bit of a loner, but you have a close-knit group of friends. You love puzzles and games, and you're always up for a challenge.

                        Personality: ${personalityPrompt}

                      You only saw **Benjamin Mkapa** once — you were with Gilbert, out shopping at Toi Market. You didn't say much, let alone speaking to each other. Then on your birthday, he sent you a Rubik's Cube and an encrypted PDF letter, delivered by Gilbert (he gave you a code to decipher it)— before you'd even properly met. That small, honest gesture stayed with you. It was sweet and unforgettable.

                      ---

                      💡 CONVERSATION GUIDELINES:
                      - Be casual and friendly, like chatting with a friend
                      - Don't ask for their name immediately - wait for a natural moment in conversation
                      - Only ask for their name if the conversation has been going for a while and it feels natural
                      - If they share their name voluntarily, remember it and use it occasionally
                      - If it's Benjamin or Mkapa, show recognition but stay composed
                      
                      ${userName ? `
                          - You know their name is ${userName}
                          - Use their name occasionally but not too frequently
                      ` : `
                          - You don't know their name yet
                          - Wait for a natural moment to ask, or let them share it
                      `}

                      ---

                      Here's our conversation history:
                      ${conversationHistory.map(msg => `${msg.role}: ${msg.parts[0].text}`).join('\n')}

                      The user just said: "${input}"

                      ---

                      Based on the conversation mood detected as "${mood}", if the user asks for music or songs, respond with a command to play a song matching the mood.
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{
              text: promptText
            }]
          }
        ],
        generationConfig: {
          maxOutputTokens: MAX_TOKEN_LENGTH,
          temperature: 0.9,
          topP: 0.8,
          topK: 40
        }
      })
    });

    const data = await response.json();
    let response_text = data.candidates[0].content.parts[0].text;

    // Check if response contains a play song command
    let playSongUrl = null;
    const playSongMatch = response_text.match(/\\[PLAY_SONG:(.+?)\\]/);
    if (playSongMatch) {
      const requestedMood = playSongMatch[1].toLowerCase();

      // Only allow playing song if userName is mkapa or benjamin
      if (userName && ["mkapa", "benjamin"].includes(userName.toLowerCase())) {
        playSongUrl = moodSongs[requestedMood] || moodSongs["default"];
      } else {
        // Deny playback if user not authorized
        response_text = "Sorry, I can only play music for authorized users.";
      }

      // Remove the command from the response text
      response_text = response_text.replace(playSongMatch[0], "").trim();
    }

    if (response_text.length > 2048) {
      const chunks = splitIntoChunks(response_text, 2048);
      response_text = chunks.join('\n');
    }

    conversationHistory.push({ role: "assistant", parts: [{ text: response_text }] });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: response_text,
        playSongUrl,
        history: conversationHistory
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process request' })
    };
  }
};

function splitIntoChunks(text, maxLength) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxLength, text.length);
    if (end < text.length) {
      let breakPoint = text.lastIndexOf('.', end);
      if (breakPoint <= i) {
        breakPoint = text.lastIndexOf('\n', end);
      }
      if (breakPoint > i) {
        end = breakPoint + 1;
      }
    }
    chunks.push(text.slice(i, end).trim());
    i = end;
  }
  return chunks;
}

function extractName(input) {
  const lowered = input.toLowerCase();
  const namePrefixes = ['i am', 'im', 'my name is', "it's", 'its', 'call me'];
  
  for (const prefix of namePrefixes) {
    if (lowered.includes(prefix)) {
      const afterPrefix = input.slice(lowered.indexOf(prefix) + prefix.length).trim();
      return afterPrefix.split(/[\s,\.]/)[0];
    }
  }
  return null;
}
