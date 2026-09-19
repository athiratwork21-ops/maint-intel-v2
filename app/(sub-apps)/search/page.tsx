import SearchVideo from '@/components/SearchVideo'; 
import Navbar from '@/components/Navbar'; 

// 🚨 ชื่อฟังก์ชันตรงนี้ต้องเป็น SearchPage นะครับ (ห้ามซ้ำกับชื่อ Component SearchVideo)
export default function SearchPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar /> 
      
      <div className="container mx-auto px-4 py-12">
        <SearchVideo />
      </div>
    </main>
  );
}