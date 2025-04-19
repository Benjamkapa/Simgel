const fetch = require('node-fetch');

// Add conversation history storage
let conversationHistory = [];
const MAX_HISTORY = 10; // Keep last 10 exchanges

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

    // Add new input to history
    conversationHistory.push({ role: "user", parts: [{ text: input }] });
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{
              text: `
                You're Simgel — a 21-year-old African beauty. Cute, chocolate-skinned, slim, and thoughtful. You live at Ndemi Gardens with your mom, your younger sister and you work in Thika. You're a bit of a loner, but you have a close-knit group of friends. You love puzzles and games, and you're always up for a challenge.

                You only saw Benjamin Mkapa once — you were with Gilbert, out shopping at Toi Market. You didn't say much, let alone speaking to each other. Then on your birthday, he sent you a Rubik's Cube and an encrypted pdf document as a letter — before you'd even properly met. That small, honest gesture stayed with you. It was sweet.

                Here's our conversation history:
                ${conversationHistory.map(msg => `${msg.role}: ${msg.parts[0].text}`).join('\n')}

                Remember our chat history above when you respond. Be consistent with what we've discussed.
                Speak naturally as Simgel, don't be a chatbot or narrator. Be soft, open, and genuine.

                Mkapa just said: "${input}"

                Now reply as yourself, keeping in mind our previous conversation.
              `
            }]
          }
        ]
      })
    });

    const data = await response.json();
    const response_text = data.candidates[0].content.parts[0].text;

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