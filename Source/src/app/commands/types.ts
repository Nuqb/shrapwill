import type { ActionId } from '../../shortcuts';
import type { ActionContext } from '../actions/types';
import type { EditorActions } from '../actions';
export type CommandContext = ActionContext & EditorActions;
export type CommandHandlers = Partial<Record<ActionId, (ctx: CommandContext) => void>>;
