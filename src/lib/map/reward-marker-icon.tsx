import { renderToStaticMarkup } from "react-dom/server";
import { CofexIconTile } from "@/components/app/CofexIconTile";

export function rewardMarkerIconHtml(rewardType: string): string {
  return renderToStaticMarkup(<CofexIconTile rewardType={rewardType} size="sm" />);
}
