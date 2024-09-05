require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Load knowledge base
const knowledgeBaseFolder = path.join(__dirname, 'knowledgebase');
let knowledgeBase = [];

fs.readdirSync(knowledgeBaseFolder).forEach(file => {
    const filePath = path.join(knowledgeBaseFolder, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    knowledgeBase = knowledgeBase.concat(data.services);  // Assuming each file has a 'services' array
});

// Function to search knowledge base
const searchKnowledgeBase = (query) => {
    const results = knowledgeBase.filter(service =>
        service.service_name.toLowerCase().includes(query.toLowerCase()) ||
        service.summary.toLowerCase().includes(query.toLowerCase())
    );
    return results.length > 0 ? results : null;
};

app.post('/chat', async (req, res) => {
    const userInput = req.body.input;
    const conversationHistory = req.body.history || '';

    // Check knowledge base
    const knowledgeResults = searchKnowledgeBase(userInput);
    if (knowledgeResults) {
        const response = `Based on your query, here is something from our services: ${knowledgeResults[0].summary}`;
        return res.json({ response });
    }

    // If no match in knowledge base, use GPT-3.5
    try {
        const gptResponse = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'gpt-3.5-turbo',
                prompt: `You are an AI assistant helping a user explore AI solutions for their business. Answer based on this query: ${userInput}.`,
                max_tokens: 150,
                temperature: 0.8,
                stop: ["\n"]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );
        const botResponse = gptResponse.data.choices[0].text.trim();
        res.json({ response: botResponse });
    } catch (error) {
        res.status(500).json({ error: "Error generating response" });
    }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
