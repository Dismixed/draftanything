import { permanentRedirect } from "next/navigation";

export default function FreezeFramesPage() {
  permanentRedirect("/freezeframes/daily");
}
