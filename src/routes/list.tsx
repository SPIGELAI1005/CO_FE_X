import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/list")({
  beforeLoad: () => {
    throw redirect({
      to: "/explore",
      search: {
        q: "",
        tags: [],
        amenities: [],
        free: false,
        campaignsOnly: false,
        minRating: 0,
        sort: "distance",
        view: "list",
        radius: 5,
      },
    });
  },
});
