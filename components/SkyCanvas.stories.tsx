import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SkyCanvas } from "./SkyCanvas";

const meta = {
  title: "Sky/SkyCanvas",
  component: SkyCanvas,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    scene: { control: "radio", options: ["sunny", "cloudy"] },
    rain: { control: "boolean" },
  },
} satisfies Meta<typeof SkyCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sunny: Story = {
  args: { scene: "sunny" },
};

export const Cloudy: Story = {
  args: { scene: "cloudy" },
};
