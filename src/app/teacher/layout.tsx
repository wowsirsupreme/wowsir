import TeacherNav from '@/components/TeacherNav';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TeacherNav />
    </>
  );
}
