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
      meta: {
        timezone: string;
      };
      date: {
        gregorian: {
          date: string;
        };
      };
      timings: {
        Fajr: string;
        Asr: string;
      };
    }
  ];
}

export interface IPrayTime {
  timezone: string;
  date: string;
  Fajr: string;
  Asr: string;
}

export type MyContext = ConversationFlavor<Context>;
export type MyConversationContext = HydrateFlavor<Context>;
export type MyConversation = Conversation<MyContext, MyConversationContext>;
