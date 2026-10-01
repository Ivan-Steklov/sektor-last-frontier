import { API_URL } from "../app/constants";
import { ResearchPanel } from "../research/ResearchPanel";

export function ResearchScreen() {
  return <ResearchPanel apiUrl={API_URL} />;
}