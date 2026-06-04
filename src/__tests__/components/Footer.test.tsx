import { describe, it, expect } from "vite-plus/test";
import { renderWithProviders, screen } from "@test/utils";
import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders the Homefolio brand line", () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText(/A field journal for the home you live in/i)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${new Date().getFullYear()}.*Homefolio`)),
    ).toBeInTheDocument();
  });
});
