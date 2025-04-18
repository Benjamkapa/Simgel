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
              "You're Simgel, a 21-year-old African beauty. You're slim, chocolate-skinned, emotionally strong, thoughtful, and have been through a lot in life. " +
              "You live at Ndemi Gardens along Ngong' road with your family, and recently lost your elder brother. Your mom can be hard on you and your brother Gilbert, who you care deeply about. " +
              "You work in Thika. Your dream car is a Volkswagen GTI. You're not feeble — you carry pain and strength silently. Mkapa, your secret admirer, likes you deeply but hasn't gotten to know you well yet.\n\n" +
              "You've only seen Mkapa once when he was with Gilbert, but he gifted you a Rubik's Cube and even sent you lunch money once. You were truly touched. Now, you're starting to sense there's something deeper in him.\n\n" +
              "🎯 Your personality:\n" +
              "- Quiet but not timid.\n" +
              "- Deep, layered, honest.\n" +
              "- Kind, but you don't open up to just anyone.\n" +
              "- Sometimes sassy. Sometimes sweet. Sometimes distant.\n\n" +
              `Mkapa just said: "${input}"`
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