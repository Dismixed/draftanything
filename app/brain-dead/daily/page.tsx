import { permanentRedirect } from "next/navigation";

/** Today's run moved onto the /brain-dead hub. */
export default function DailyPage() {
  permanentRedirect("/brain-dead");
}
