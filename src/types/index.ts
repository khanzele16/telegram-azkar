import {
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import { HydrateFlavor } from "@grammyjs/hydrate";
import { type Context } from "grammy";
import { BotCommand } from "grammy/types";

export interface ICommand extends BotCommand {
  action: (ctx: MyContext) => Promise<void>;
}

export interface IPrayTimeResponse {
  data: [
    {
      date: {
        gregorian: {
          date: string;
        };
      };
      timings: {
        Fajr: string;
        Maghrib: string;
      };
    }
  ];
}

export interface IPrayTime {
  date: string;
  Fajr: string;
  Maghrib: string;
}

export type MyContext = ConversationFlavor<Context>;
export type MyConversationContext = HydrateFlavor<Context>;
export type MyConversation = Conversation<MyContext, MyConversationContext>;
