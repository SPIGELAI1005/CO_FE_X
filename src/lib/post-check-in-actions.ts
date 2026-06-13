export type PostCheckInActionId =
  | "claimable_challenge"
  | "city_almost_done"
  | "write_review"
  | "campaign"
  | "passport"
  | "explore";

export interface PostCheckInAction {
  id: PostCheckInActionId;
  title: string;
  subtitle: string;
}

interface ShopCampaign {
  id: string;
  title: string;
}

interface ClaimableChallenge {
  title: string;
  reward: number;
}

interface CityProgressHint {
  cityName: string;
  visited: number;
  target: number;
}

export function getPostCheckInActions({
  campaigns = [],
  claimableChallenge,
  cityProgress,
}: {
  campaigns?: ShopCampaign[];
  claimableChallenge?: ClaimableChallenge | null;
  cityProgress?: CityProgressHint | null;
}): PostCheckInAction[] {
  const actions: PostCheckInAction[] = [];
  const topCampaign = campaigns[0];

  if (claimableChallenge) {
    actions.push({
      id: "claimable_challenge",
      title: `Claim ${claimableChallenge.title}`,
      subtitle: `+${claimableChallenge.reward} pts ready on Radar`,
    });
  }

  if (
    cityProgress &&
    cityProgress.visited < cityProgress.target &&
    cityProgress.visited >= cityProgress.target - 1
  ) {
    actions.push({
      id: "city_almost_done",
      title: `Almost done in ${cityProgress.cityName}`,
      subtitle: `${cityProgress.visited}/${cityProgress.target} cafés. One more stamp!`,
    });
  }

  actions.push({
    id: "write_review",
    title: "Write a review",
    subtitle: "Share your experience · +5 pts",
  });

  if (topCampaign) {
    actions.push({
      id: "campaign",
      title: "Join EEFFOC campaign",
      subtitle: topCampaign.title,
    });
  }

  actions.push(
    {
      id: "passport",
      title: "View passport stamp",
      subtitle: "Your collection just grew",
    },
    {
      id: "explore",
      title: "Explore more cafés",
      subtitle: "Keep your streak going",
    },
  );

  return actions;
}
