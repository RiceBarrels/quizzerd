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
        const { question, correctAnswer, studentAnswer, maxPoints, questionType } = body;

        if (!question || !studentAnswer) {
            return NextResponse.json({ error: 'Question and student answer are required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert exam grader. Grade the following student answer.

Question: ${question}
${correctAnswer ? `Correct/Expected Answer: ${correctAnswer}` : ''}
Student's Answer: ${studentAnswer}
Question Type: ${questionType || 'open-ended'}
Maximum Points: ${maxPoints || 10}

Please evaluate the student's answer and provide:
1. A score out of ${maxPoints || 10} points
2. Brief feedback explaining the score

Respond in JSON format:
{
    "score": <number>,
    "feedback": "<brief feedback>",
    "isCorrect": <true if full marks, false otherwise>
}

Be fair but rigorous in grading. Consider partial credit for partially correct answers.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const gradeResult = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
                success: true,
                ...gradeResult
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to parse AI response'
        }, { status: 500 });

    } catch (error) {
        console.error('Error in AI grading:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
