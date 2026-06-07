import { createFileRoute, redirect } from "@tanstack/react-router";
import { getHomeFn } from "@/server/home";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const home = await getHomeFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      // The home screen is the tabbed section view; default to Rooms.
      throw redirect({ to: "/rooms" });
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
});
