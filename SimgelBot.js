// require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const say = require('say');
const readlineSync = require('readline-sync');
// const Microphone = require('node-microphone');
const fs = require('fs');

// === CONFIG ===
const genAI = new GoogleGenerativeAI("AIzaSyCXOmIXs9hDlZDa7U45FUtd3e53y8b6ft0");
const DEFAULT_VOICE = 'Microsoft Zira Desktop';
const SPEED = 1;
const USER_NAME = 'Mkapa'; // Your name
let currentVoice = DEFAULT_VOICE;

// === Voice recording (record-only, no fallback to typing) ===
function recordVoiceInput() {
    return new Promise((resolve, reject) => {
        console.log('🎤 Speak now (5 seconds)...');
        const mic = new Microphone();
        const outputFile = fs.createWriteStream('temp_recording.wav');

        try {
            const micStream = mic.startRecording();
            micStream.on('data', data => outputFile.write(data));
            micStream.on('error', err => {
                mic.stopRecording();
                reject(err);
            });

            setTimeout(() => {
                mic.stopRecording();
                outputFile.end();
                console.log("⏹️ Recording ended.");
                resolve(); // No need to ask user to type
            }, 5000);
        } catch (error) {
            reject(error);
        }
    });
}

// === Speak text out loud ===
async function speakAsync(text, voice = currentVoice, speed = SPEED) {
    return new Promise((resolve, reject) => {
        const cleaned = text.replace(/\*/g, '');
        say.speak(cleaned, voice, speed, err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// === Change voice dynamically (Windows only) ===
function changeVoice() {
    console.log('\nAvailable voices:');
    const voices = say.getInstalledVoices();
    voices.forEach((v, i) => {
        console.log(`[${i}] ${v}`);
    });

    const index = readlineSync.questionInt('\nEnter the number of the voice you want to use: ');
    if (voices[index]) {
        currentVoice = voices[index];
        console.log(`🔊 Voice changed to: ${currentVoice}`);
    } else {
        console.log("❌ Invalid choice. Keeping previous voice.");
    }
}

// === AI response as Simgel ===
async function getResponse(input) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
You are Simgel, a 21-year-old AI girl. Mkapa is your secret admirer. 
You’re aware of his admiration but you're playful about it — a bit teasing, 
a bit flirty, but warm, respectful, and emotionally in tune.

Speak like someone who finds him endearing, and is happy he's always around.
You sound young, expressive, and emotionally rich — never robotic.

Mkapa just said: "${input}"

Now respond as Simgel. Show appreciation, curiosity, playfulness, and that you enjoy his attention.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

// === Main loop ===
async function interactWithBot() {
    await speakAsync("Hi Mkapa. It's so nice to hear from you again.");
    // console.log("\n💬 SIMGEL BOT READY FOR HER SECRET ADMIRER 💌");
    console.log("Type 'exit' to quit, or type 'voice' to change the speaking voice.\n");

    const inputChoice = readlineSync.keyInSelect(['Type', 'Speak'], 'How do you want to talk to Simgel?');
    if (inputChoice === -1) {
        await speakAsync("Okay, maybe next time...");
        return;
    }

    const useVoice = inputChoice === 1;

    while (true) {
        let userInput = '';

        if (useVoice) {
            try {
                await recordVoiceInput();
                userInput = readlineSync.question('What did you say (type for now, voice input not transcribed yet): ');
            } catch (err) {
                console.error('Voice input failed:', err.message);
                await speakAsync("Hmm, I couldn't hear you, Mkapa.");
                continue;
            }
        } else {
            userInput = readlineSync.question('You: ');
        }

        if (!userInput.trim()) continue;

        const normalized = userInput.toLowerCase();

        if (['exit', 'bye', 'stop'].includes(normalized)) {
            await speakAsync("Aww, you're leaving already? Okay... see you soon, Mkapa.");
            break;
        }

        if (normalized === 'voice') {
            changeVoice();
            continue;
        }

        try {
            console.log("💭 Thinking...");
            const response = await getResponse(userInput);
            console.log(`\nSimgel: ${response}\n`);
            await speakAsync(response);
        } catch (error) {
            console.error('AI Error:', error.message);
            await speakAsync("Oops... something went wrong. Want to try again?");
        }
    }
}

// === Run the bot ===
interactWithBot().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
