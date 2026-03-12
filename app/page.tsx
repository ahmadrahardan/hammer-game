// page.tsx
// import HomeOnline from "@/components/HomeOnline";
// import HomeSimple from "@/components/HomeSimple";

// export default function Home() {
//   const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
//   return isMaintenance ? <HomeSimple /> : <HomeOnline />;
// }

import HomeSimple from "@/components/HomeSimple";

export default function Home() {
  return <HomeSimple />;
}