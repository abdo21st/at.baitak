import { NextRequest, NextResponse } from 'next/server';
import { initialProjects } from '@/lib/data-store';
import { Project } from '@/lib/types';

let projectsStore: Project[] = [...initialProjects];

export async function GET() {
  return NextResponse.json({ success: true, projects: projectsStore });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, clientName, hourlyRate, budgetHours, color } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم المشروع مطلوب' }, { status: 400 });
    }

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      clientName: clientName || '',
      hourlyRate: Number(hourlyRate) || 0.0,
      budgetHours: Number(budgetHours) || 0.0,
      color: color || '#0284c7'
    };

    projectsStore.unshift(newProject);
    return NextResponse.json({ success: true, project: newProject });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في إضافة المشروع' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, clientName, hourlyRate, budgetHours, color } = body;

    const index = projectsStore.findIndex((p) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'المشروع غير موجود' }, { status: 404 });
    }

    projectsStore[index] = {
      ...projectsStore[index],
      name: name || projectsStore[index].name,
      clientName: clientName !== undefined ? clientName : projectsStore[index].clientName,
      hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : projectsStore[index].hourlyRate,
      budgetHours: budgetHours !== undefined ? Number(budgetHours) : projectsStore[index].budgetHours,
      color: color || projectsStore[index].color
    };

    return NextResponse.json({ success: true, project: projectsStore[index] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في تعديل المشروع' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    projectsStore = projectsStore.filter((p) => p.id !== id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false, error: 'المعرف غير موجود' }, { status: 400 });
}
