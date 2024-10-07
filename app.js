
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 8000;

// Directory to store user conversations
const CONVERSATIONS_DIR = path.join(__dirname, 'conversations');
if (!fs.existsSync(CONVERSATIONS_DIR)) {
    fs.mkdirSync(CONVERSATIONS_DIR);
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI('AIzaSyBRAoxsU60y5kvIZwSrW4lFcsxeBsMKZug');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h2>Enter your name</h2>
                <form action="/chat" method="post">
                    <label for="name">Name:</label>
                    <input type="text" id="name" name="name" required>
                    <input type="submit" value="Submit">
                </form>
            </body>
        </html>
    `);
});

app.post('/chat', (req, res) => {
    const name = req.body.name;
    const userFile = path.join(CONVERSATIONS_DIR, `${name}.json`);
    let conversations = [];
    let userName = name;

    if (fs.existsSync(userFile)) {
        const data = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
        conversations = data.conversations || [];
        userName = data.name || name;
    } else {
        fs.writeFileSync(userFile, JSON.stringify({ name: userName, conversations: [] }, null, 2));
    }

    res.send(`
        <html>
            <body>
                <h2>Chat with AI</h2>
                <form action="/send_message" method="post">
                    <input type="hidden" name="name" value="${userName}">
                    <label for="message">Message:</label>
                    <input type="text" id="message" name="message" required>
                    <input type="submit" value="Send">
                </form>
                <h3>Conversation History</h3>
                <ul>
                    ${conversations.map(msg => `<li>${msg}</li>`).join('')}
                </ul>
            </body>
        </html>
    `);
});

app.post('/send_message', async (req, res) => {
    const name = req.body.name;
    const message = req.body.message;
    const userFile = path.join(CONVERSATIONS_DIR, `${name}.json`);
    let conversations = [];
    let userName = name;

    if (fs.existsSync(userFile)) {
        const data = JSON.parse(fs.readFileSync(userFile, 'utf-8'));
        conversations = data.conversations || [];
        userName = data.name || name;
    }

    // Include the conversation history in the prompt
    const conversationHistory = conversations.join('\n');
    const prompt = `User's name is ${userName}. Conversation history:\n${conversationHistory}\nUser: ${message}`;
    const result = await model.generateContent(prompt);
    const response = `AI: ${result.response.text()}`;

    conversations.push(`You: ${message}`);
    conversations.push(response);

    fs.writeFileSync(userFile, JSON.stringify({ name: userName, conversations: conversations }, null, 2));

    res.send(`
        <html>
            <body>
                <h2>Chat with AI</h2>
                <form action="/send_message" method="post">
                    <input type="hidden" name="name" value="${userName}">
                    <label for="message">Message:</label>
                    <input type="text" id="message" name="message" required>
                    <input type="submit" value="Send">
                </form>
                <h3>Conversation History</h3>
                <ul>
                    ${conversations.map(msg => `<li>${msg}</li>`).join('')}
                </ul>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
