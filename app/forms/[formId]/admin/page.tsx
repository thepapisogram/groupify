import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { AdminDashboard } from "@/components/groupify/admin-dashboard";
import { ObjectId } from "mongodb";
import { safeObjectId } from "@/lib/mongodb";

export default async function AdminDashboardServerPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { formId } = await params;
  const { token: adminTokenFromUrl } = await searchParams;

  const client = await clientPromise;
  const db = client.db("groupify");

  const form = await db.collection("forms").findOne({ _id: safeObjectId(formId) as unknown as ObjectId });

  if (!form) {
    redirect("/");
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  const userEmail = session?.user?.email;

  const isOwner = !!(form.userId && userId === form.userId);
  const isSharedAdmin = !!(userEmail && form.confirmedAdmins && form.confirmedAdmins.includes(userEmail));
  
  const hasValidToken = adminTokenFromUrl && form.adminToken === adminTokenFromUrl;
  const hasSessionAccess = isOwner || isSharedAdmin;

  if (!hasValidToken && !hasSessionAccess) {
    redirect(`/forms/${formId}`);
  }

  const submissions = await db
    .collection("submissions")
    .find({ formId })
    .sort({ submittedAt: -1 })
    .toArray();

  const formConfig = {
    title: form.title,
    fields: form.fields || [],
    isClosed: form.isClosed || false,
    adminToken: form.adminToken,
    userId: form.userId,
    description: form.description || "",
  };

  const serializedSubmissions = submissions.map((s) => ({
    _id: s._id.toString(),
    submittedAt: s.submittedAt.toISOString(),
    data: s.data,
  }));

  return (
    <AdminDashboard 
      formId={formId} 
      initialFormConfig={formConfig} 
      initialSubmissions={serializedSubmissions} 
      adminToken={form.adminToken}
      isOwner={isOwner}
    />
  );
}
