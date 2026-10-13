import { permanentRedirect } from "next/navigation";

export default function GettingWarmerPage() {
  permanentRedirect("/getting-warmer/daily");
}
