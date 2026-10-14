import { permanentRedirect } from "next/navigation";

/** Today's puzzle plays at /anyguessr, behind its intro. */
export default function AnyGuessrDailyPage() {
  permanentRedirect("/anyguessr");
}
