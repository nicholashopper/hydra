import Anthropic from '@anthropic-ai/sdk';
import { BrowserWindow } from 'electron';
import { BROWSER_TOOLS } from './tools';
import { BrowserController } from '../browser-controller';
import type { BrowserTarget, ChatMessage, ActionResult } from '../../shared/types';
import { AI_MODEL, AI_SYSTEM_PROMPT, AI_MAX_CONVERSATION_MESSAGES, SCROLL_AMOUNTS } from '../../shared/constants';
import { IPC } from '../../shared/ipc-channels';

type MessageParam = Anthropic.MessageParam;
type ToolUseBlock = Anthropic.ToolUseBlock;
type ToolResultBlockParam = Anthropic.ToolResultBlockParam;

export class AIAgent {
  private client: Anthropic;
  private conversation: MessageParam[] = [];
  private browserController: BrowserController;
  private mainWindow: BrowserWindow;
  private stopRequested: boolean = false;

  constructor(browserController: BrowserController, mainWindow: BrowserWindow) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
    this.browserController = browserController;
    this.mainWindow = mainWindow;
  }

  async sendMessage(userMessage: string): Promise<ChatMessage> {
    this.stopRequested = false;

    // Add user message to conversation
    this.conversation.push({
      role: 'user',
      content: userMessage
    });

    // Trim conversation if too long
    if (this.conversation.length > AI_MAX_CONVERSATION_MESSAGES) {
      this.conversation = this.conversation.slice(-AI_MAX_CONVERSATION_MESSAGES);
    }

    // Get initial page state to provide context
    const pageStates = await this.browserController.getPageState('all');
    const contextMessage = `Current browser states:\n${pageStates.map((state, i) =>
      `Browser ${i + 1}: ${state.url} - "${state.title}"`
    ).join('\n')}`;

    // Notify UI we're thinking
    this.mainWindow.webContents.send(IPC.AI_THINKING, true);

    let response: Anthropic.Messages.Message;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      // Initial API call
      response = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: 4096,
        system: `${AI_SYSTEM_PROMPT}\n\n${contextMessage}`,
        tools: BROWSER_TOOLS,
        messages: this.conversation
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Handle tool use loop
      while (response.stop_reason === 'tool_use' && !this.stopRequested) {
        const toolUseBlocks = response.content.filter(
          (block): block is ToolUseBlock => block.type === 'tool_use'
        );

        const toolResults: ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          // Notify UI about tool call
          this.mainWindow.webContents.send(IPC.AI_TOOL_CALL, {
            name: toolUse.name,
            input: toolUse.input
          });

          // Execute tool
          const result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          });
        }

        // Add assistant message with tool use
        this.conversation.push({
          role: 'assistant',
          content: response.content
        });

        // Add tool results
        this.conversation.push({
          role: 'user',
          content: toolResults
        });

        // Continue conversation
        response = await this.client.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          system: AI_SYSTEM_PROMPT,
          tools: BROWSER_TOOLS,
          messages: this.conversation
        });

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
      );
      const finalText = textBlocks.map(b => b.text).join('\n');

      // Add final assistant message
      this.conversation.push({
        role: 'assistant',
        content: response.content
      });

      // Notify UI about token usage
      this.mainWindow.webContents.send(IPC.AI_TOKEN_COUNT, {
        input: totalInputTokens,
        output: totalOutputTokens
      });

      this.mainWindow.webContents.send(IPC.AI_THINKING, false);

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: finalText || 'Task completed.',
        timestamp: Date.now(),
        tokenCount: totalInputTokens + totalOutputTokens
      };
    } catch (error) {
      this.mainWindow.webContents.send(IPC.AI_THINKING, false);
      throw error;
    }
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<ActionResult> {
    const target = (input.target as BrowserTarget) || 'all';

    try {
      switch (name) {
        case 'navigate':
          return await this.browserController.navigate(input.url as string, target);

        case 'click':
          return await this.browserController.click(input.element as string, target);

        case 'type':
          return await this.browserController.type(
            input.element as string,
            input.text as string,
            {
              clearFirst: input.clear_first !== false,
              pressEnter: input.press_enter === true
            },
            target
          );

        case 'scroll':
          return await this.browserController.scroll(
            input.direction as 'up' | 'down',
            (input.amount as keyof typeof SCROLL_AMOUNTS) || 'medium',
            target
          );

        case 'wait':
          return await this.browserController.wait(
            input.condition as string,
            input.value as string,
            (input.timeout_seconds as number) || 10,
            target
          );

        case 'extract':
          return await this.browserController.extract(input.selector as string, target);

        case 'get_page_info': {
          const states = await this.browserController.getPageState(target);
          let screenshot: string | undefined;

          if (input.include_screenshot) {
            screenshot = await this.browserController.screenshot(target);
          }

          return {
            success: true,
            data: {
              states,
              screenshot
            }
          };
        }

        case 'screenshot': {
          const screenshot = await this.browserController.screenshot(target);
          return {
            success: true,
            data: screenshot
          };
        }

        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  stop(): void {
    this.stopRequested = true;
  }

  clearConversation(): void {
    this.conversation = [];
  }
}
