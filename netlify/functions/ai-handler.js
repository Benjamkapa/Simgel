const fetch = require('node-fetch');

// Add conversation history storage with increased limits
let conversationHistory = [];
const MAX_HISTORY = 15; // Increased from 10 to allow longer conversations
const MAX_TOKEN_LENGTH = 30000; // Increased token limit for Gemini

// Add this near the top with other state variables
let hasAskedName = false;
let userName = null;

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

    // Check if this input contains a name response
    if (hasAskedName && !userName) {
      const namePrefixes = ['i am', 'im', 'my name is', "it's", 'its', 'call me'];
      const loweredInput = input.toLowerCase();
      const isNameResponse = namePrefixes.some(prefix => loweredInput.includes(prefix));
      
      if (isNameResponse) {
        userName = extractName(input);
      }
    }

    // Add new input to history with chunking for long inputs
    const chunks = splitIntoChunks(input, 2048); // Split long inputs
    chunks.forEach(chunk => {
      conversationHistory.push({ role: "user", parts: [{ text: chunk }] });
    });

    // Maintain history within limits
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    // Modify the prompt text to include name tracking
    const promptText = `
                        You're Simgel — a 21-year-old African beauty. Cute, chocolate-skinned, slim, and thoughtful. You live at Ndemi Gardens with your mom, your younger sister and you work in Thika. You're a bit of a loner, but you have a close-knit group of friends. You love puzzles and games, and you're always up for a challenge.

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

    // Handle long responses
    if (response_text.length > 2048) {
      const chunks = splitIntoChunks(response_text, 2048);
      response_text = chunks.join('\n'); // Join chunks with newlines
    }

    // Add AI response to history
    conversationHistory.push({ role: "assistant", parts: [{ text: response_text }] });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: response_text,
        history: conversationHistory // Optional: send history to frontend
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

// Helper function to split long text into chunks
function splitIntoChunks(text, maxLength) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    // Find a good breaking point (sentence end or paragraph)
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

// Add this helper function to extract names from responses
function extractName(input) {
  const lowered = input.toLowerCase();
  const namePrefixes = ['i am', 'im', 'my name is', "it's", 'its', 'call me'];
  
  for (const prefix of namePrefixes) {
    if (lowered.includes(prefix)) {
      const afterPrefix = input.slice(lowered.indexOf(prefix) + prefix.length).trim();
      // Take the first word after the prefix as the name
      return afterPrefix.split(/[\s,\.]/)[0];
    }
  }
  return null;
}