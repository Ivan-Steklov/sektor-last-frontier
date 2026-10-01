import { API_URL } from "../app/constants";
import { ExpeditionsPanel } from "../expeditions/ExpeditionsPanel";
import { ShipsPanel } from "../ships/ShipsPanel";

export function FleetScreen() {
  return (
    <>
      <ShipsPanel apiUrl={API_URL} />
      <ExpeditionsPanel apiUrl={API_URL} />
    </>
  );
}