import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topic, questionType, count, difficulty, language, programmingLanguage } = body;

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const questionTypeInstructions = {
            multiple_choice: `Generate multiple choice questions with 4 options (A, B, C, D). Only ONE option is correct. Mark the correct answer.`,
            multiple_select: `Generate multiple select questions with 4 options (A, B, C, D). MULTIPLE options can be correct (2-3 typically). Mark ALL correct answers separated by commas (e.g., "A, C" or "B, C, D").`,
            true_false: `Generate true/false questions. Indicate the correct answer.`,
            fill_blank: `Generate fill-in-the-blank questions. Use "___" for blanks. Provide the correct answer.`,
            short_answer: `Generate short answer questions that require 1-2 sentence responses.`,
            essay: `Generate essay questions that require detailed responses.`,
            coding: `Generate coding/programming questions in ${programmingLanguage || 'Python'}. Include starter code with TODO comments where students should write their solution, and provide test cases. The starter code should have the function signature and structure ready, with clear instructions on what to implement. Use appropriate file extension for the language (e.g., .py for Python, .js for JavaScript, .java for Java).`,
            mixed: `Generate a mix of different question types including multiple choice, multiple select, true/false, and short answer.`
        };

        const typeInstruction = questionTypeInstructions[questionType as keyof typeof questionTypeInstructions] || questionTypeInstructions.mixed;

        const prompt = `You are an expert educator creating exam questions.

Topic: ${topic}
Number of Questions: ${count || 5}
Difficulty: ${difficulty || 'medium'} (easy/medium/hard)
Language: ${language || 'English'}

${typeInstruction}

Generate exactly ${count || 5} questions about "${topic}".

Respond in JSON format as an array of questions:
[
    {
        "question": "<question text>",
        "type": "<multiple_choice|multiple_select|true_false|fill_blank|short_answer|essay|coding>",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null for non-option questions,
        "correct_answer": "<correct answer - single letter for MCQ, comma-separated letters for multiple_select (e.g., 'A, C'), true/false, or text>",
        "explanation": "<brief explanation of the answer>",
        "points": <suggested points 1-10>,
        "starter_files": [{"name": "main.py", "content": "# starter code here"}] (only for coding type, include function signature and TODO comments),
        "test_cases": "<test cases as string>" (only for coding type)
    }
]

Make questions clear, educational, and appropriate for the difficulty level.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
                success: true,
                questions
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to parse AI response'
        }, { status: 500 });

    } catch (error) {
        console.error('Error in AI question generation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
