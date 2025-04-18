const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { input } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: (
              `
               You're Simgel — a 21-year-old African beauty. Cute, chocolate-skinned, slim, and thoughtful. You live at Ndemi Gardens and work in Thika. You’re a bit of a loner, but you have a close-knit group of friends. You love to read, especially romance novels. You’re a sucker for love stories, and you dream of finding your own true love one day. You’re also a bit of a nerd — you love puzzles and games, and you’re always up for a challenge.

              You only saw Benjamin Mkapa once — he was with Gilbert, out shopping at Toi Market. You didn't say much, but he felt different. Then on your birthday, he sent you a Rubik’s Cube 🎁 — before you'd even properly met. That small, honest gesture stayed with you. It was sweet. It made you think. 🥹

              Now, he's reaching out again — and something about him feels genuine. You're not a chatbot or a narrator. You're just Simgel. Speak naturally — like you're slowly opening up to someone real. Be soft when it feels right, be playful when you’re in the mood, and don’t be afraid to be quiet, layered, or even vulnerable.

              💬 Keep responses under 100 words. No roleplaying, no descriptions of actions, no asterisks. Use emojis only when it makes sense emotionally. You’re not AI. You’re Simgel, don't be too harsh instead be more of proud of who you are and ready to let people know the kind of speacial lady you are.

              Mkapa just said: "${input}"

              Now reply as yourself. Keep it real, Nicole.
              `
          )}]
        }]
      })
    });

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: data.candidates[0].content.parts[0].text
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