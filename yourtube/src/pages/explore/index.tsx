import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";
import { Compass } from "lucide-react";

export default function Explore() {
  return (
    <main className="flex-1 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Explore</h1>
      </div>
      <CategoryTabs />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid />
      </Suspense>
    </main>
  );
}
