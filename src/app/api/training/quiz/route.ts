import { NextResponse, NextRequest } from 'next/server';
import quizzesData from '@/data/microQuizzes.json';

// GET: Fetch today's micro quiz question
export async function GET() {
  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const quizIndex = dayOfYear % quizzesData.length;
    const quiz = quizzesData[quizIndex];

    // Return question without disclosing correct answer
    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        category: quiz.category,
        question: quiz.question,
        options: quiz.options
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Verify employee quiz answer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, selectedIndex } = body;

    const quiz = quizzesData.find((q) => q.id === quizId);
    if (!quiz) {
      return NextResponse.json({ success: false, error: 'السؤال غير موجود' }, { status: 404 });
    }

    const isCorrect = quiz.correctIndex === Number(selectedIndex);

    return NextResponse.json({
      success: true,
      isCorrect,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation,
      message: isCorrect ? '🎉 إجابة صحيحة وممتازة! أحسنت يا بطل.' : '❌ إجابة غير دقيقة، راجع الشرح الصيدلاني المعتمد أدناه.'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
