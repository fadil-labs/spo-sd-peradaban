import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: templates, error: templatesError } = await supabase
      .from("bill_templates")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("is_recurring", true);

    if (templatesError) {
      return NextResponse.json({ error: "Gagal memuat templat tagihan." }, { status: 500 });
    }

    const results = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const template of templates || []) {
      const { data: existingBill } = await supabase
        .from("student_bills")
        .select("id, due_date")
        .eq("bill_template_id", template.id)
        .eq("school_id", profile.school_id)
        .order("due_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingBill) {
        const lastDueDate = new Date(existingBill.due_date);
        lastDueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 27) {
          results.push({ templateId: template.id, status: "skipped", reason: `Tagihan terakhir dibuat ${diffDays} hari lalu` });
          continue;
        }
      }

      let targetStudentIds: string[] = [];
      if (template.student_id) {
        targetStudentIds = [template.student_id];
      } else if (template.class_id) {
        const { data: enrollments } = await supabase
          .from("student_enrollments")
          .select("student_id")
          .eq("class_id", template.class_id)
          .eq("school_id", profile.school_id)
          .eq("status", "active");

        targetStudentIds = (enrollments || []).map((e) => e.student_id);
      } else {
        const { data: allStudents } = await supabase
          .from("students")
          .select("id")
          .eq("school_id", profile.school_id)
          .eq("status", "active");

        targetStudentIds = (allStudents || []).map((s) => s.id);
      }

      let createdCount = 0;
      for (const studentId of targetStudentIds) {
        const { data: student } = await supabase
          .from("students")
          .select("id, nis, full_name")
          .eq("id", studentId)
          .maybeSingle();

        if (!student) continue;

        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30);

        const { error: billError } = await supabase.from("student_bills").insert({
          school_id: profile.school_id,
          student_id: student.id,
          payment_category_id: template.payment_category_id,
          bill_template_id: template.id,
          amount: template.amount,
          description: template.description,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
          is_recurring: true,
        });

        if (billError) {
          if (billError.code !== "23505") {
            results.push({ templateId: template.id, studentId: student.id, status: "error", message: billError.message });
          }
        } else {
          createdCount += 1;
        }
      }

      results.push({ templateId: template.id, status: "success", createdCount });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menjalankan scheduler." }, { status: 500 });
  }
}
