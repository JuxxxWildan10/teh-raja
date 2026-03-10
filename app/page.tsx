import { redirect } from "next/navigation";

export default function Home() {
  // Langsung arahkan (redirect) pengunjung dari root '/' ke halaman '/pos'
  redirect('/pos');
}
