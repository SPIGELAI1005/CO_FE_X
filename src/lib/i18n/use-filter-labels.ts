import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  EXPLORE_AMENITY_FILTERS,
  EXPLORE_RATING_FILTERS,
  EXPLORE_REWARD_FILTERS,
  EXPLORE_TAG_FILTERS,
  type ExploreFilterOption,
} from "@/lib/explore-filters";
import { EXPLORE_SORT_OPTIONS, type ExploreSortValue } from "@/components/app/ExploreSortSelect";

export function useExploreFilterLabels() {
  const { t } = useTranslation();

  return useMemo(() => {
    const rewardFilters: ExploreFilterOption[] = EXPLORE_REWARD_FILTERS.map((f) => ({
      ...f,
      label: t(`filters.rewards.${f.id}.label`),
      description: t(`filters.rewards.${f.id}.description`),
    }));

    const tagFilters: ExploreFilterOption[] = EXPLORE_TAG_FILTERS.map((f) => ({
      ...f,
      label: t(`filters.tags.${f.id}`),
    }));

    const amenityFilters: ExploreFilterOption[] = EXPLORE_AMENITY_FILTERS.map((f) => ({
      ...f,
      label: t(`filters.amenities.${f.id}.label`),
      description: t(`filters.amenities.${f.id}.description`),
    }));

    const ratingFilters = EXPLORE_RATING_FILTERS.map(({ value, Icon }) => ({
      value,
      Icon,
      label: t(`filters.ratings.${value}`),
    }));

    return { rewardFilters, tagFilters, amenityFilters, ratingFilters };
  }, [t]);
}

export function useExploreSortLabels() {
  const { t } = useTranslation();

  return useMemo(
    () =>
      EXPLORE_SORT_OPTIONS.map((o) => ({
        ...o,
        label: t(`sort.options.${o.value}.label`),
        description: t(`sort.options.${o.value}.description`),
      })),
    [t],
  );
}

export function useExploreSortLabel(value: ExploreSortValue) {
  const options = useExploreSortLabels();
  return options.find((o) => o.value === value) ?? options[0];
}
