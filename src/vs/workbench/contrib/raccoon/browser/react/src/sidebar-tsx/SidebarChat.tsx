/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, FormEvent, FormHTMLAttributes, Fragment, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { useAccessor, useChatThreadsState, useChatThreadsStreamState, useSettingsState, useActiveURI, useCommandBarState, useFullChatThreadsStreamState } from '../util/services.js';
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';

import { ChatMarkdownRender, ChatMessageLocation, getApplyBoxId } from '../markdown/ChatMarkdownRender.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { IDisposable } from '../../../../../../../base/common/lifecycle.js';
import { ErrorDisplay } from './ErrorDisplay.js';
import { BlockCode, TextAreaFns, RaccoonCustomDropdownBox, RaccoonInputBox2, RaccoonSlider, RaccoonSwitch, RaccoonDiffEditor } from '../util/inputs.js';
import { ModelDropdown } from '../raccoon-settings-tsx/ModelDropdown.js';
import { PastThreadsList } from './SidebarThreadSelector.js';
import { raccoon_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { raccoon_OPEN_SETTINGS_ACTION_ID } from '../../../raccoonSettingsPane.js';
import { ChatMode, displayInfoOfProviderName, FeatureName, isFeatureNameDisabled } from '../../../../../../../workbench/contrib/raccoon/common/raccoonSettingsTypes.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { WarningBox } from '../raccoon-settings-tsx/WarningBox.js';
import { getModelCapabilities, getIsReasoningEnabledState } from '../../../../common/modelCapabilities.js';
import { AlertTriangle, File, Ban, Check, ChevronRight, Dot, FileIcon, Pencil, Undo, Undo2, X, Flag, Copy as CopyIcon, Info, CirclePlus, Ellipsis, CircleEllipsis, Folder, ALargeSmall, TypeOutline, Text, History, Mic } from 'lucide-react';
import { ChatMessage, CheckpointEntry, StagingSelectionItem, ToolMessage } from '../../../../common/chatThreadServiceTypes.js';
import { approvalTypeOfBuiltinToolName, BuiltinToolCallParams, BuiltinToolName, ToolName, LintErrorItem, ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js';
import { CopyButton, EditToolAcceptRejectButtonsHTML, IconShell1, JumpToFileButton, JumpToTerminalButton, StatusIndicator, StatusIndicatorForApplyButton, useApplyStreamState, useEditToolStreamState } from '../markdown/ApplyBlockHoverButtons.js';
import { IsRunningType } from '../../../chatThreadService.js';
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from '../../../../common/helpers/colors.js';
import { builtinToolNames, isABuiltinToolName, MAX_FILE_CHARS_PAGE, MAX_TERMINAL_INACTIVE_TIME } from '../../../../common/prompt/prompts.js';
import { RawToolCallObj } from '../../../../common/sendLLMMessageTypes.js';
import ErrorBoundary from './ErrorBoundary.js';
import { ToolApprovalTypeSwitch } from '../raccoon-settings-tsx/Settings.js';

import { persistentTerminalNameOfId } from '../../../terminalToolService.js';
import { removeMCPToolNamePrefix } from '../../../../common/mcpServiceTypes.js';



export const IconX = ({ size, className = '', ...props }: { size: number; className?: string; } & React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			className={className}
			{...props}>
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				d='M6 18 18 6M6 6l12 12' />
		</svg>);
};

const IconArrowUp = ({ size, className = '' }: { size: number; className?: string; }) => {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg">
			<path
				fill="black"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z">
			</path>
		</svg>);
};


const IconSquare = ({ size, className = '' }: { size: number; className?: string; }) => {
	return (
		<svg
			className={className}
			stroke="black"
			fill="black"
			strokeWidth="0"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg">
			<rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
		</svg>);
};


export const IconWarning = ({ size, className = '' }: { size: number; className?: string; }) => {
	return (
		<svg
			className={className}
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 16 16"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg">
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z" />
		</svg>);
};


export const IconLoading = ({ className = '' }: { className?: string; }) => {

	const [loadingText, setLoadingText] = useState('.');

	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval>;

		const toggleLoadingText = () => {
			if (loadingText === '...') {
				setLoadingText('.');
			} else {
				setLoadingText(loadingText + '.');
			}
		};

		intervalId = setInterval(toggleLoadingText, 300);

		return () => clearInterval(intervalId);
	}, [loadingText, setLoadingText]);

	return <div className={`${className}`}>{loadingText}</div>;
};




export const getRelativeTime = (timestamp: number) => {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return 'now';
	if (minutes < 60) return `${minutes}m`;
	if (hours < 24) return `${hours}h`;
	return `${days}d`;
};

const SidebarHeader = ({ mode, onNewThread, onShowHistory, onMore, onClose }: {
	mode: string;
	onNewThread: () => void;
	onShowHistory: () => void;
	onMore: () => void;
	onClose: () => void;
}) => {
	return (
		<div className="raccoon-flex raccoon-items-center raccoon-justify-between raccoon-px-4 raccoon-py-2 raccoon-border-b raccoon-border-raccoon-border-3 raccoon-bg-raccoon-bg-1">
			<div className="raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-font-medium">{mode}</div>
			<div className="raccoon-flex raccoon-items-center raccoon-gap-3 raccoon-text-raccoon-fg-3">
				<CirclePlus size={16} className="raccoon-cursor-pointer hover:raccoon-text-raccoon-fg-1" onClick={onNewThread} />
				<History size={16} className="raccoon-cursor-pointer hover:raccoon-text-raccoon-fg-1" onClick={onShowHistory} />
				<Ellipsis size={16} className="raccoon-cursor-pointer hover:raccoon-text-raccoon-fg-1" onClick={onMore} />
				<X size={16} className="raccoon-cursor-pointer hover:raccoon-text-raccoon-fg-1" onClick={onClose} />
			</div>
		</div>
	);
};

// SLIDER ONLY:
const ReasoningOptionSlider = ({ featureName }: { featureName: FeatureName; }) => {
	const accessor = useAccessor();

	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const raccoonSettingsState = useSettingsState();

	const modelSelection = raccoonSettingsState.modelSelectionOfFeature[featureName];
	const overridesOfModel = raccoonSettingsState.overridesOfModel;

	if (!modelSelection) return null;

	const { modelName, providerName } = modelSelection;
	const { reasoningCapabilities } = getModelCapabilities(providerName, modelName, overridesOfModel);
	const { canTurnOffReasoning, reasoningSlider: reasoningBudgetSlider } = reasoningCapabilities || {};

	const modelSelectionOptions = raccoonSettingsState.optionsOfModelSelection[featureName][providerName]?.[modelName];
	const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel);

	if (canTurnOffReasoning && !reasoningBudgetSlider) {
		return <div className="raccoon-flex raccoon-items-center raccoon-gap-x-2">
			<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none raccoon-inline-block raccoon-w-10 raccoon-pr-1">Thinking</span>
			<RaccoonSwitch
				size='xxs'
				value={isReasoningEnabled}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && !newVal;
					raccoonSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff });
				}} />
		</div>;
	}

	if (reasoningBudgetSlider?.type === 'budget_slider') {
		const { min: min_, max, default: defaultVal } = reasoningBudgetSlider;

		const nSteps = 8;
		const stepSize = Math.round((max - min_) / nSteps);

		const valueIfOff = min_ - stepSize;
		const min = canTurnOffReasoning ? valueIfOff : min_;
		const value = isReasoningEnabled
			? raccoonSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningBudget ?? defaultVal
			: valueIfOff;

		return <div className="raccoon-flex raccoon-items-center raccoon-gap-x-2">
			<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none raccoon-inline-block raccoon-w-10 raccoon-pr-1">Thinking</span>
			<RaccoonSlider
				width={50}
				size='xs'
				min={min}
				max={max}
				step={stepSize}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff;
					raccoonSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningBudget: newVal });
				}} />
			<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{isReasoningEnabled ? `${value} tokens` : 'Thinking disabled'}</span>
		</div>;
	}

	if (reasoningBudgetSlider?.type === 'effort_slider') {

		const { values, default: defaultVal } = reasoningBudgetSlider;

		const min = canTurnOffReasoning ? -1 : 0;
		const max = values.length - 1;

		const currentEffort = raccoonSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningEffort ?? defaultVal;
		const valueIfOff = -1;
		const value = isReasoningEnabled && currentEffort ? values.indexOf(currentEffort) : valueIfOff;

		const currentEffortCapitalized = currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1, Infinity);

		return <div className="raccoon-flex raccoon-items-center raccoon-gap-x-2">
			<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none raccoon-inline-block raccoon-w-10 raccoon-pr-1">Thinking</span>
			<RaccoonSlider
				width={30}
				size='xs'
				min={min}
				max={max}
				step={1}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff;
					raccoonSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningEffort: values[newVal] ?? undefined });
				}} />
			<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{isReasoningEnabled ? `${currentEffortCapitalized}` : 'Thinking disabled'}</span>
		</div>;
	}

	return null;
};



const nameOfChatMode = {
	'normal': 'Chat',
	'gather': 'Gather',
	'agent': 'Agent'
};

const detailOfChatMode = {
	'normal': 'Normal chat',
	'gather': 'Reads files, but can\'t edit',
	'agent': 'Edits files and uses tools'
};


const ChatModeDropdown = ({ className }: { className: string; }) => {
	const accessor = useAccessor();

	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const settingsState = useSettingsState();

	const options: ChatMode[] = useMemo(() => ['normal', 'gather', 'agent'], []);

	const onChangeOption = useCallback((newVal: ChatMode) => {
		raccoonSettingsService.setGlobalSetting('chatMode', newVal);
	}, [raccoonSettingsService]);

	return <RaccoonCustomDropdownBox
		className={className}
		options={options}
		selectedOption={settingsState.globalSettings.chatMode}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(val) => nameOfChatMode[val]}
		getOptionDropdownName={(val) => nameOfChatMode[val]}
		getOptionDropdownDetail={(val) => detailOfChatMode[val]}
		getOptionsEqual={(a, b) => a === b} />;
};


interface raccoonChatAreaProps {
	children: React.ReactNode;
	onSubmit: () => void;
	onAbort: () => void;
	isStreaming: boolean;
	isDisabled?: boolean;
	divRef?: React.RefObject<HTMLDivElement | null>;
	className?: string;
	showModelDropdown?: boolean;
	showSelections?: boolean;
	showProspectiveSelections?: boolean;
	loadingIcon?: React.ReactNode;
	selections?: StagingSelectionItem[];
	setSelections?: (s: StagingSelectionItem[]) => void;
	onClickAnywhere?: () => void;
	onClose?: () => void;
	onNewThread?: () => void;
	featureName: FeatureName;
}

export const RaccoonChatArea: React.FC<raccoonChatAreaProps> = ({
	children,
	onSubmit,
	onAbort,
	onClose,
	onClickAnywhere,
	divRef,
	isStreaming = false,
	isDisabled = false,
	className = '',
	showModelDropdown = true,
	showSelections = false,
	showProspectiveSelections = false,
	selections,
	setSelections,
	featureName,
	onNewThread,
	loadingIcon
}) => {
	return (
		<div
			ref={divRef}
			className={` raccoon-flex raccoon-flex-col raccoon-p-3 raccoon-relative raccoon-shrink-0 raccoon-rounded-xl raccoon-bg-raccoon-bg-1 raccoon-transition-all raccoon-duration-200 raccoon-border raccoon-border-raccoon-border-3 focus-within:raccoon-border-raccoon-border-1 hover:raccoon-border-raccoon-border-1 raccoon-shadow-lg raccoon-max-h-[80vh] ${className} `}
			onClick={() => {
				onClickAnywhere?.();
			}}>

			{showSelections && selections && setSelections &&
				<SelectedFiles
					type='staging'
					selections={selections}
					setSelections={setSelections}
					showProspectiveSelections={showProspectiveSelections} />
			}

			<div className="raccoon-relative raccoon-w-full raccoon-mb-2">
				{children}
				{onClose &&
					<div className="raccoon-absolute -raccoon-top-1 -raccoon-right-1 raccoon-cursor-pointer raccoon-z-1">
						<IconX
							size={12}
							className="raccoon-stroke-[2] raccoon-opacity-80 raccoon-text-raccoon-fg-3 hover:raccoon-brightness-95"
							onClick={onClose} />
					</div>
				}
			</div>

			<div className="raccoon-flex raccoon-flex-row raccoon-justify-between raccoon-items-center raccoon-gap-1">
				<div className="raccoon-flex raccoon-items-center raccoon-gap-3">
					<div className="raccoon-p-1 raccoon-rounded hover:raccoon-bg-raccoon-bg-2 raccoon-cursor-pointer"
						onClick={onNewThread}>
						<CirclePlus size={16} className="raccoon-text-raccoon-fg-3" />
					</div>
					{showModelDropdown &&
						<div className="raccoon-flex raccoon-items-center raccoon-flex-wrap raccoon-gap-x-3 raccoon-text-nowrap ">
							{featureName === 'Chat' && <ChatModeDropdown className="raccoon-text-xs raccoon-font-medium raccoon-text-raccoon-fg-3 hover:raccoon-text-raccoon-fg-1" />}
							<ModelDropdown featureName={featureName} className="raccoon-text-xs raccoon-font-medium raccoon-text-raccoon-fg-3 hover:raccoon-text-raccoon-fg-1" />
						</div>
					}
				</div>

				<div className="raccoon-flex raccoon-items-center raccoon-gap-3">
					<div className="raccoon-p-1 raccoon-rounded hover:raccoon-bg-raccoon-bg-2 raccoon-cursor-pointer">
						<Mic size={16} className="raccoon-text-raccoon-fg-3" />
					</div>
					<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
						{isStreaming && loadingIcon}
						{isStreaming
							? <ButtonStop onClick={onAbort} className="raccoon-size-7" />
							: <ButtonSubmit onClick={onSubmit} disabled={isDisabled} className="raccoon-size-7" />
						}
					</div>
				</div>
			</div>
		</div>);
};


type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
const DEFAULT_BUTTON_SIZE = 22;
export const ButtonSubmit = ({ className, disabled, ...props }: ButtonProps & Required<Pick<ButtonProps, 'disabled'>>) => {
	return <button
		type='button'
		className={`raccoon-rounded-full raccoon-flex-shrink-0 raccoon-flex-grow-0 raccoon-flex raccoon-items-center raccoon-justify-center ${disabled ? "raccoon-bg-vscode-disabled-fg raccoon-cursor-default" : "raccoon-bg-white raccoon-cursor-pointer"} ${className} `}
		{...props}>
		<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="raccoon-stroke-[2] raccoon-p-[2px]" />
	</button>;
};

export const ButtonStop = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return <button
		className={`raccoon-rounded-full raccoon-flex-shrink-0 raccoon-flex-grow-0 raccoon-cursor-pointer raccoon-flex raccoon-items-center raccoon-justify-center raccoon-bg-white ${className} `}
		type='button'
		{...props}>
		<IconSquare size={DEFAULT_BUTTON_SIZE} className="raccoon-stroke-[3] raccoon-p-[7px]" />
	</button>;
};


const scrollToBottom = (divRef: { current: HTMLElement | null; }) => {
	if (divRef.current) {
		divRef.current.scrollTop = divRef.current.scrollHeight;
	}
};


const ScrollToBottomContainer = ({ children, className, style, scrollContainerRef }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>; }) => {
	const [isAtBottom, setIsAtBottom] = useState(true);

	const divRef = scrollContainerRef;

	const onScroll = () => {
		const div = divRef.current;
		if (!div) return;

		const isBottom = Math.abs(
			div.scrollHeight - div.clientHeight - div.scrollTop
		) < 4;

		setIsAtBottom(isBottom);
	};

	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom(divRef);
		}
	}, [children, isAtBottom]);

	useEffect(() => {
		scrollToBottom(divRef);
	}, []);

	return (
		<div
			ref={divRef}
			onScroll={onScroll}
			className={className}
			style={style}>
			{children}
		</div>);
};

export const getRelative = (uri: URI, accessor: ReturnType<typeof useAccessor>) => {
	const workspaceContextService = accessor.get('IWorkspaceContextService');
	let path: string;
	const isInside = workspaceContextService.isInsideWorkspace(uri);
	if (isInside) {
		const f = workspaceContextService.getWorkspace().folders.find((f) => uri.fsPath?.startsWith(f.uri.fsPath));
		if (f) { path = uri.fsPath.replace(f.uri.fsPath, ''); } else
		{ path = uri.fsPath; }
	} else {
		path = uri.fsPath;
	}
	return path || undefined;
};

export const getFolderName = (pathStr: string) => {
	pathStr = pathStr.replace(/[/\\]+/g, '/');
	const parts = pathStr.split('/');
	const nonEmptyParts = parts.filter((part) => part.length > 0);
	if (nonEmptyParts.length === 0) return '/';
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + '/';
	const lastTwo = nonEmptyParts.slice(-2);
	return lastTwo.join('/') + '/';
};

export const getBasename = (pathStr: string, parts: number = 1) => {
	pathStr = pathStr.replace(/[/\\]+/g, '/');
	const allParts = pathStr.split('/');
	if (allParts.length === 0) return pathStr;
	return allParts.slice(-parts).join('/');
};


export const raccoonOpenFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number]) => {
	const commandService = accessor.get('ICommandService');
	const editorService = accessor.get('ICodeEditorService');

	let editorSelection = undefined;

	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER
		};
	}

	commandService.executeCommand('vscode.open', uri).then(() => {
		setTimeout(() => {
			if (!editorSelection) return;

			const editor = editorService.getActiveCodeEditor();
			if (!editor) return;

			editor.setSelection(editorSelection);
			editor.revealRange(editorSelection, ScrollType.Immediate);
		}, 50);
	});
};


export const SelectedFiles = (
	{ type, selections, setSelections, showProspectiveSelections, messageIdx }:
		| { type: 'past'; selections: StagingSelectionItem[]; setSelections?: undefined; showProspectiveSelections?: undefined; messageIdx: number; }
		| { type: 'staging'; selections: StagingSelectionItem[]; setSelections: ((newSelections: StagingSelectionItem[]) => void); showProspectiveSelections?: boolean; messageIdx?: number; }) => {

	const accessor = useAccessor();
	const commandService = accessor.get('ICommandService');
	const modelReferenceService = accessor.get('IRaccoonModelService');

	const { uri: currentURI } = useActiveURI();
	const [recentUris, setRecentUris] = useState<URI[]>([]);
	const maxRecentUris = 10;
	const maxProspectiveFiles = 3;
	useEffect(() => {
		if (!currentURI) return;
		setRecentUris((prev) => {
			const withoutCurrent = prev.filter((uri) => uri.fsPath !== currentURI.fsPath);
			const withCurrent = [currentURI, ...withoutCurrent];
			return withCurrent.slice(0, maxRecentUris);
		});
	}, [currentURI]);
	const [prospectiveSelections, setProspectiveSelections] = useState<StagingSelectionItem[]>([]);

	useEffect(() => {
		const computeRecents = async () => {
			const prospectiveURIs = recentUris
				.filter((uri) => !selections.find((s) => s.type === 'File' && s.uri.fsPath === uri.fsPath))
				.slice(0, maxProspectiveFiles);

			const answer: StagingSelectionItem[] = [];
			for (const uri of prospectiveURIs) {
				answer.push({
					type: 'File',
					uri: uri,
					language: (await modelReferenceService.getModelSafe(uri)).model?.getLanguageId() || 'plaintext',
					state: { wasAddedAsCurrentFile: false }
				});
			}
			return answer;
		};

		if (type === 'staging' && showProspectiveSelections) {
			computeRecents().then((a) => setProspectiveSelections(a));
		} else {
			setProspectiveSelections([]);
		}
	}, [recentUris, selections, type, showProspectiveSelections]);


	const allSelections = [...selections, ...prospectiveSelections];

	if (allSelections.length === 0) {
		return null;
	}

	return (
		<div className="raccoon-flex raccoon-items-center raccoon-flex-wrap raccoon-text-left raccoon-relative raccoon-gap-x-0.5 raccoon-gap-y-1 raccoon-pb-0.5">
			{allSelections.map((selection, i) => {

				const isThisSelectionProspective = i > selections.length - 1;

				const thisKey = selection.type === 'CodeSelection' ? selection.type + selection.language + selection.range + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
					: selection.type === 'File' ? selection.type + selection.language + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
						: selection.type === 'Folder' ? selection.type + selection.language + selection.state + selection.uri.fsPath
							: i;

				const SelectionIcon =
					selection.type === 'File' ? File
						: selection.type === 'Folder' ? Folder
							: selection.type === 'CodeSelection' ? Text
								: undefined as never;

				return <div
					key={thisKey}
					className={`raccoon-flex raccoon-flex-col raccoon-space-y-[1px]`}>
					<span className="raccoon-truncate raccoon-overflow-hidden raccoon-text-ellipsis"
						data-tooltip-id='raccoon-tooltip'
						data-tooltip-content={getRelative(selection.uri, accessor)}
						data-tooltip-place='top'
						data-tooltip-delay-show={3000}>
						<div
							className={` raccoon-flex raccoon-items-center raccoon-gap-1 raccoon-relative raccoon-px-1 raccoon-w-fit raccoon-h-fit raccoon-select-none raccoon-text-xs raccoon-text-nowrap raccoon-border raccoon-rounded-sm ${isThisSelectionProspective ? "raccoon-bg-raccoon-bg-1 raccoon-text-raccoon-fg-3 raccoon-opacity-80" : "raccoon-bg-raccoon-bg-1 hover:raccoon-brightness-95 raccoon-text-raccoon-fg-1"} ${isThisSelectionProspective ? "raccoon-border-raccoon-border-2" : "raccoon-border-raccoon-border-1"} hover:raccoon-border-raccoon-border-1 raccoon-transition-all raccoon-duration-150 `}
							onClick={() => {
								if (type !== 'staging') return;
								if (isThisSelectionProspective) {
									setSelections([...selections, selection]);
								} else if (selection.type === 'File') {
									raccoonOpenFileFn(selection.uri, accessor);
									const wasAddedAsCurrentFile = selection.state.wasAddedAsCurrentFile;
									if (wasAddedAsCurrentFile) {
										const newSelection: StagingSelectionItem = { ...selection, state: { ...selection.state, wasAddedAsCurrentFile: false } };
										setSelections([
											...selections.slice(0, i),
											newSelection,
											...selections.slice(i + 1)]
										);
									}
								} else if (selection.type === 'CodeSelection') {
									raccoonOpenFileFn(selection.uri, accessor, selection.range);
								} else if (selection.type === 'Folder') {
									// TODO!!! reveal in tree
								}
							}}>
							{<SelectionIcon size={10} />}
							{getBasename(selection.uri.fsPath) + (
								selection.type === 'CodeSelection' ? ` (${selection.range[0]}-${selection.range[1]})` : '')
							}
							{selection.type === 'File' && selection.state.wasAddedAsCurrentFile && messageIdx === undefined && currentURI?.fsPath === selection.uri.fsPath
								? <span className={`raccoon-text-[8px] raccoon-'raccoon-opacity-60 raccoon-text-raccoon-fg-4`}>
									{`(Current File)`}
								</span>
								: null
							}
							{type === 'staging' && !isThisSelectionProspective
								? <div
									className="raccoon-cursor-pointer raccoon-z-1 raccoon-self-stretch raccoon-flex raccoon-items-center raccoon-justify-center"
									onClick={(e) => {
										e.stopPropagation();
										if (type !== 'staging') return;
										setSelections([...selections.slice(0, i), ...selections.slice(i + 1)]);
									}}>
									<IconX
										className="raccoon-stroke-[2]"
										size={10} />
								</div>
								: <></>
							}
						</div>
					</span>
				</div>;
			})}
		</div>);
};


type ToolHeaderParams = {
	icon?: React.ReactNode;
	title: React.ReactNode;
	desc1: React.ReactNode;
	desc1OnClick?: () => void;
	desc2?: React.ReactNode;
	isError?: boolean;
	info?: string;
	desc1Info?: string;
	isRejected?: boolean;
	numResults?: number;
	hasNextPage?: boolean;
	children?: React.ReactNode;
	bottomChildren?: React.ReactNode;
	onClick?: () => void;
	desc2OnClick?: () => void;
	isOpen?: boolean;
	className?: string;
};

const ToolHeaderWrapper = ({
	icon,
	title,
	desc1,
	desc1OnClick,
	desc1Info,
	desc2,
	numResults,
	hasNextPage,
	children,
	info,
	bottomChildren,
	isError,
	onClick,
	desc2OnClick,
	isOpen,
	isRejected,
	className
}: ToolHeaderParams) => {

	const [isOpen_, setIsOpen] = useState(false);
	const isExpanded = isOpen !== undefined ? isOpen : isOpen_;

	const isDropdown = children !== undefined;
	const isClickable = !!(isDropdown || onClick);

	const isDesc1Clickable = !!desc1OnClick;

	const desc1HTML = <span
		className={`raccoon-text-raccoon-fg-4 raccoon-text-xs raccoon-italic raccoon-truncate raccoon-ml-2 ${isDesc1Clickable ? "raccoon-cursor-pointer hover:raccoon-brightness-125 raccoon-transition-all raccoon-duration-150" : ""} `}
		onClick={desc1OnClick}
		{...desc1Info ? {
			'data-tooltip-id': 'raccoon-tooltip',
			'data-tooltip-content': desc1Info,
			'data-tooltip-place': 'top',
			'data-tooltip-delay-show': 1000
		} : {}}>
		{desc1}</span>;

	return <div className="">
		<div className={`raccoon-w-full raccoon-border raccoon-border-raccoon-border-3 raccoon-rounded raccoon-px-2 raccoon-py-1 raccoon-bg-raccoon-bg-3 raccoon-overflow-hidden ${className}`}>
			<div className={`raccoon-select-none raccoon-flex raccoon-items-center raccoon-min-h-[24px]`}>
				<div className={`raccoon-flex raccoon-items-center raccoon-w-full raccoon-gap-x-2 raccoon-overflow-hidden raccoon-justify-between ${isRejected ? "raccoon-line-through" : ""}`}>
					<div
						className="raccoon-ml-1 raccoon-flex raccoon-items-center raccoon-overflow-hidden">
						<div className={` raccoon-flex raccoon-items-center raccoon-min-w-0 raccoon-overflow-hidden raccoon-grow ${isClickable ? "raccoon-cursor-pointer hover:raccoon-brightness-125 raccoon-transition-all raccoon-duration-150" : ""} `}
							onClick={() => {
								if (isDropdown) { setIsOpen((v) => !v); }
								if (onClick) { onClick(); }
							}}>
							{isDropdown && <ChevronRight
								className={` raccoon-text-raccoon-fg-3 raccoon-mr-0.5 raccoon-h-4 raccoon-w-4 raccoon-flex-shrink-0 raccoon-transition-transform raccoon-duration-100 raccoon-ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? "raccoon-rotate-90" : ""} `} />
							}
							<span className="raccoon-text-raccoon-fg-3 raccoon-flex-shrink-0">{title}</span>
							{!isDesc1Clickable && desc1HTML}
						</div>
						{isDesc1Clickable && desc1HTML}
					</div>

					<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-flex-shrink-0">
						{info && <CircleEllipsis
							className="raccoon-ml-2 raccoon-text-raccoon-fg-4 raccoon-opacity-60 raccoon-flex-shrink-0"
							size={14}
							data-tooltip-id='raccoon-tooltip'
							data-tooltip-content={info}
							data-tooltip-place='top-end' />
						}
						{isError && <AlertTriangle
							className="raccoon-text-raccoon-warning raccoon-opacity-90 raccoon-flex-shrink-0"
							size={14}
							data-tooltip-id='raccoon-tooltip'
							data-tooltip-content={'Error running tool'}
							data-tooltip-place='top' />
						}
						{isRejected && <Ban
							className="raccoon-text-raccoon-fg-4 raccoon-opacity-90 raccoon-flex-shrink-0"
							size={14}
							data-tooltip-id='raccoon-tooltip'
							data-tooltip-content={'Canceled'}
							data-tooltip-place='top' />
						}
						{desc2 && <span className="raccoon-text-raccoon-fg-4 raccoon-text-xs" onClick={desc2OnClick}>
							{desc2}
						</span>}
						{numResults !== undefined &&
							<span className="raccoon-text-raccoon-fg-4 raccoon-text-xs raccoon-ml-auto raccoon-mr-1">
								{`${numResults}${hasNextPage ? '+' : ''} result${numResults !== 1 ? 's' : ''}`}
							</span>
						}
					</div>
				</div>
			</div>
			{<div
				className={`raccoon-overflow-hidden raccoon-transition-all raccoon-duration-200 raccoon-ease-in-out ${isExpanded ? "raccoon-opacity-100 raccoon-py-1" : "raccoon-max-h-0 raccoon-opacity-0"} raccoon-text-raccoon-fg-4 raccoon-rounded-sm raccoon-overflow-x-auto `}>
				{children}
			</div>}
		</div>
		{bottomChildren}
	</div>;
};


const EditTool = ({ toolMessage, threadId, messageIdx, content }: Parameters<ResultWrapper<'edit_file' | 'rewrite_file'>>[0] & { content: string; }) => {
	const accessor = useAccessor();
	const isError = false;
	const isRejected = toolMessage.type === 'rejected';

	const title = getTitle(toolMessage);

	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
	const icon = null;

	const { rawParams, params, name } = toolMessage;
	const desc1OnClick = () => raccoonOpenFileFn(params.uri, accessor);
	const componentParams: ToolHeaderParams = { title, desc1, desc1OnClick, desc1Info, isError, icon, isRejected };


	const editToolType = toolMessage.name === 'edit_file' ? 'diff' : 'rewrite';
	if (toolMessage.type === 'running_now' || toolMessage.type === 'tool_request') {
		componentParams.children = <ToolChildrenWrapper className="raccoon-bg-raccoon-bg-3">
			<EditToolChildren
				uri={params.uri}
				code={content}
				type={editToolType} />
		</ToolChildrenWrapper>;
	} else if (toolMessage.type === 'success' || toolMessage.type === 'rejected' || toolMessage.type === 'tool_error') {
		const applyBoxId = getApplyBoxId({
			threadId: threadId,
			messageIdx: messageIdx,
			tokenIdx: 'N/A'
		});
		componentParams.desc2 = <EditToolHeaderButtons
			applyBoxId={applyBoxId}
			uri={params.uri}
			codeStr={content}
			toolName={name}
			threadId={threadId} />;

		componentParams.children = <ToolChildrenWrapper className="raccoon-bg-raccoon-bg-3">
			<EditToolChildren
				uri={params.uri}
				code={content}
				type={editToolType} />
		</ToolChildrenWrapper>;

		if (toolMessage.type === 'success' || toolMessage.type === 'rejected') {
			const { result } = toolMessage;
			componentParams.bottomChildren = <BottomChildren title='Lint errors'>
				{result?.lintErrors?.map((error, i) =>
					<div key={i} className="raccoon-whitespace-nowrap">Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
				)}
			</BottomChildren>;
		} else if (toolMessage.type === 'tool_error') {
			const { result } = toolMessage;
			componentParams.bottomChildren = <BottomChildren title='Error'>
				<CodeChildren>
					{result}
				</CodeChildren>
			</BottomChildren>;
		}
	}

	return <ToolHeaderWrapper {...componentParams} />;
};

const SimplifiedToolHeader = ({
	title,
	children
}: { title: string; children?: React.ReactNode; }) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDropdown = children !== undefined;
	return (
		<div>
			<div className="raccoon-w-full">
				<div
					className={`raccoon-select-none raccoon-flex raccoon-items-center raccoon-min-h-[24px] ${isDropdown ? "raccoon-cursor-pointer" : ""}`}
					onClick={() => {
						if (isDropdown) { setIsOpen((v) => !v); }
					}}>
					{isDropdown &&
						<ChevronRight
							className={`raccoon-text-raccoon-fg-3 raccoon-mr-0.5 raccoon-h-4 raccoon-w-4 raccoon-flex-shrink-0 raccoon-transition-transform raccoon-duration-100 raccoon-ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? "raccoon-rotate-90" : ""}`} />
					}
					<div className="raccoon-flex raccoon-items-center raccoon-w-full raccoon-overflow-hidden">
						<span className="raccoon-text-raccoon-fg-3">{title}</span>
					</div>
				</div>
				{<div
					className={`raccoon-overflow-hidden raccoon-transition-all raccoon-duration-200 raccoon-ease-in-out ${isOpen ? "raccoon-opacity-100" : "raccoon-max-h-0 raccoon-opacity-0"} raccoon-text-raccoon-fg-4`}>
					{children}
				</div>}
			</div>
		</div>);
};


const UserMessageComponent = ({ chatMessage, messageIdx, isCheckpointGhost, currCheckpointIdx, _scrollToBottom }: { chatMessage: ChatMessage & { role: 'user'; }; messageIdx: number; currCheckpointIdx: number | undefined; isCheckpointGhost: boolean; _scrollToBottom: (() => void) | null; }) => {

	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');

	let isBeingEdited = false;
	let stagingSelections: StagingSelectionItem[] = [];
	let setIsBeingEdited = (_: boolean) => { };
	let setStagingSelections = (_: StagingSelectionItem[]) => { };

	if (messageIdx !== undefined) {
		const _state = chatThreadsService.getCurrentMessageState(messageIdx);
		isBeingEdited = _state.isBeingEdited;
		stagingSelections = _state.stagingSelections;
		setIsBeingEdited = (v) => chatThreadsService.setCurrentMessageState(messageIdx, { isBeingEdited: v });
		setStagingSelections = (s) => chatThreadsService.setCurrentMessageState(messageIdx, { stagingSelections: s });
	}

	const mode: ChatBubbleMode = isBeingEdited ? 'edit' : 'display';
	const [isFocused, setIsFocused] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isDisabled, setIsDisabled] = useState(false);
	const [textAreaRefState, setTextAreaRef] = useState<HTMLTextAreaElement | null>(null);
	const textAreaFnsRef = useRef<TextAreaFns | null>(null);
	const _mustInitialize = useRef(true);
	const _justEnabledEdit = useRef(false);
	useEffect(() => {
		const canInitialize = mode === 'edit' && textAreaRefState;
		const shouldInitialize = _justEnabledEdit.current || _mustInitialize.current;
		if (canInitialize && shouldInitialize) {
			setStagingSelections(
				(chatMessage.selections || []).map((s) => {
					if (s.type === 'File') return { ...s, state: { ...s.state, wasAddedAsCurrentFile: false } }; else
						return s;
				})
			);

			if (textAreaFnsRef.current)
				textAreaFnsRef.current.setValue(chatMessage.displayContent || '');

			textAreaRefState.focus();

			_justEnabledEdit.current = false;
			_mustInitialize.current = false;
		}
	}, [chatMessage, mode, _justEnabledEdit, textAreaRefState, textAreaFnsRef.current, _justEnabledEdit.current, _mustInitialize.current]);

	const onOpenEdit = () => {
		setIsBeingEdited(true);
		chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
		_justEnabledEdit.current = true;
	};
	const onCloseEdit = () => {
		setIsFocused(false);
		setIsHovered(false);
		setIsBeingEdited(false);
		chatThreadsService.setCurrentlyFocusedMessageIdx(undefined);
	};

	const EditSymbol = mode === 'display' ? Pencil : X;

	let chatbubbleContents: React.ReactNode;
	if (mode === 'display') {
		chatbubbleContents = <>
			<SelectedFiles type='past' messageIdx={messageIdx} selections={chatMessage.selections || []} />
			<span className="raccoon-px-0.5">{chatMessage.displayContent}</span>
		</>;
	} else if (mode === 'edit') {

		const onSubmit = async () => {
			if (isDisabled) return;
			if (!textAreaRefState) return;
			if (messageIdx === undefined) return;

			const threadId = chatThreadsService.state.currentThreadId;

			await chatThreadsService.abortRunning(threadId);

			setIsBeingEdited(false);
			chatThreadsService.setCurrentlyFocusedMessageIdx(undefined);

			const userMessage = textAreaRefState.value;
			try {
				await chatThreadsService.editUserMessageAndStreamResponse({ userMessage, messageIdx, threadId });
			} catch (e) {
				console.error('Error while editing message:', e);
			}
			await chatThreadsService.focusCurrentChat();
			requestAnimationFrame(() => _scrollToBottom?.());
		};

		const onAbort = async () => {
			const threadId = chatThreadsService.state.currentThreadId;
			await chatThreadsService.abortRunning(threadId);
		};

		const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				onCloseEdit();
			}
			if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
				onSubmit();
			}
		};

		if (!chatMessage.content) {
			return null;
		}

		chatbubbleContents = <RaccoonChatArea
			featureName='Chat'
			onSubmit={onSubmit}
			onAbort={onAbort}
			isStreaming={false}
			isDisabled={isDisabled}
			showSelections={true}
			showProspectiveSelections={false}
			selections={stagingSelections}
			setSelections={setStagingSelections}>
			<RaccoonInputBox2
				enableAtToMention
				ref={setTextAreaRef}
				className="raccoon-min-h-[81px] raccoon-max-h-[500px] raccoon-px-0.5"
				placeholder="Edit your message..."
				onChangeText={(text) => setIsDisabled(!text)}
				onFocus={() => {
					setIsFocused(true);
					chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
				}}
				onBlur={() => {
					setIsFocused(false);
				}}
				onKeyDown={onKeyDown}
				fnsRef={textAreaFnsRef}
				multiline={true} />
		</RaccoonChatArea>;
	}

	const isMsgAfterCheckpoint = currCheckpointIdx !== undefined && currCheckpointIdx === messageIdx - 1;

	return <div
		className={` raccoon-relative raccoon-ml-auto ${mode === 'edit' ? "raccoon-w-full raccoon-max-w-full" : mode === 'display' ? `raccoon-self-end raccoon-w-fit raccoon-max-w-full raccoon-whitespace-pre-wrap` : ""} ${isCheckpointGhost && !isMsgAfterCheckpoint ? "raccoon-opacity-50 raccoon-pointer-events-none" : ""} `}
		onMouseEnter={() => setIsHovered(true)}
		onMouseLeave={() => setIsHovered(false)}>

		<div
			className={` raccoon-text-left raccoon-rounded-lg raccoon-max-w-full ${mode === 'edit' ? "" : mode === 'display' ? "raccoon-p-2 raccoon-flex raccoon-flex-col raccoon-bg-raccoon-bg-1 raccoon-text-raccoon-fg-1 raccoon-overflow-x-auto raccoon-cursor-pointer" : ""} `}
			onClick={() => { if (mode === 'display') { onOpenEdit(); } }}>
			{chatbubbleContents}
		</div>

		<div className="raccoon-absolute -raccoon-top-1 -raccoon-right-1 raccoon-translate-x-0 -raccoon-translate-y-0 raccoon-z-1">
			<EditSymbol
				size={18}
				className={` raccoon-cursor-pointer raccoon-p-[2px] raccoon-bg-raccoon-bg-1 raccoon-border raccoon-border-raccoon-border-1 raccoon-rounded-md raccoon-transition-opacity raccoon-duration-200 raccoon-ease-in-out ${isHovered || isFocused && mode === 'edit' ? "raccoon-opacity-100" : "raccoon-opacity-0"} `}
				onClick={() => {
					if (mode === 'display') {
						onOpenEdit();
					} else if (mode === 'edit') {
						onCloseEdit();
					}
				}} />
		</div>
	</div>;
};

const SmallProseWrapper = ({ children }: { children: React.ReactNode; }) => {
	return <div className=" raccoon-text-raccoon-fg-4 raccoon-prose raccoon-prose-sm raccoon-break-words raccoon-max-w-none raccoon-leading-snug raccoon-text-[13px] [&>:first-child]:!raccoon-mt-0 [&>:last-child]:!raccoon-mb-0 prose-h1:raccoon-text-[14px] prose-h1:raccoon-my-4 prose-h2:raccoon-text-[13px] prose-h2:raccoon-my-4 prose-h3:raccoon-text-[13px] prose-h3:raccoon-my-3 prose-h4:raccoon-text-[13px] prose-h4:raccoon-my-2 prose-p:raccoon-my-2 prose-p:raccoon-leading-snug prose-hr:raccoon-my-2 prose-ul:raccoon-my-2 prose-ul:raccoon-pl-4 prose-ul:raccoon-list-outside prose-ul:raccoon-list-disc prose-ul:raccoon-leading-snug prose-ol:raccoon-my-2 prose-ol:raccoon-pl-4 prose-ol:raccoon-list-outside prose-ol:raccoon-list-decimal prose-ol:raccoon-leading-snug marker:raccoon-text-inherit prose-blockquote:raccoon-pl-2 prose-blockquote:raccoon-my-2 prose-code:raccoon-text-raccoon-fg-3 prose-code:raccoon-text-[12px] prose-code:before:raccoon-content-none prose-code:after:raccoon-content-none prose-pre:raccoon-text-[12px] prose-pre:raccoon-p-2 prose-pre:raccoon-my-2 prose-table:raccoon-text-[13px] ">
		{children}
	</div>;
};

const ProseWrapper = ({ children }: { children: React.ReactNode; }) => {
	return <div className=" raccoon-text-raccoon-fg-2 raccoon-prose raccoon-prose-sm raccoon-break-words prose-p:raccoon-block prose-hr:raccoon-my-4 prose-pre:raccoon-my-2 marker:raccoon-text-inherit prose-ol:raccoon-list-outside prose-ol:raccoon-list-decimal prose-ul:raccoon-list-outside prose-ul:raccoon-list-disc prose-li:raccoon-my-0 prose-code:before:raccoon-content-none prose-code:after:raccoon-content-none prose-headings:raccoon-prose-sm prose-headings:raccoon-font-bold prose-p:raccoon-leading-normal prose-ol:raccoon-leading-normal prose-ul:raccoon-leading-normal raccoon-max-w-none ">
		{children}
	</div>;
};

const AssistantMessageComponent = ({ chatMessage, isCheckpointGhost, isCommitted, messageIdx }: { chatMessage: ChatMessage & { role: 'assistant'; }; isCheckpointGhost: boolean; messageIdx: number; isCommitted: boolean; }) => {

	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');

	const reasoningStr = chatMessage.reasoning?.trim() || null;
	const hasReasoning = !!reasoningStr;
	const isDoneReasoning = !!chatMessage.displayContent;
	const thread = chatThreadsService.getCurrentThread();
	if (!thread) return null;

	const chatMessageLocation: ChatMessageLocation = {
		threadId: thread.id,
		messageIdx: messageIdx
	};

	const isEmpty = !chatMessage.displayContent && !chatMessage.reasoning;
	if (isEmpty) return null;

	return <>
		{hasReasoning &&
			<div className={`${isCheckpointGhost ? "raccoon-opacity-50" : ""}`}>
				<ReasoningWrapper isDoneReasoning={isDoneReasoning} isStreaming={!isCommitted}>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={reasoningStr}
							chatMessageLocation={chatMessageLocation}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true} />
					</SmallProseWrapper>
				</ReasoningWrapper>
			</div>
		}
		{chatMessage.displayContent &&
			<div className={`${isCheckpointGhost ? "raccoon-opacity-50" : ""}`}>
				<ProseWrapper>
					<ChatMarkdownRender
						string={chatMessage.displayContent || ''}
						chatMessageLocation={chatMessageLocation}
						isApplyEnabled={true}
						isLinkDetectionEnabled={true} />
				</ProseWrapper>
			</div>
		}
	</>;
};

const ReasoningWrapper = ({ isDoneReasoning, isStreaming, children }: { isDoneReasoning: boolean; isStreaming: boolean; children: React.ReactNode; }) => {
	const isDone = isDoneReasoning || !isStreaming;
	const isWriting = !isDone;
	const [isOpen, setIsOpen] = useState(isWriting);
	useEffect(() => {
		if (!isWriting) setIsOpen(false);
	}, [isWriting]);
	return <ToolHeaderWrapper title='Reasoning' desc1={isWriting ? <IconLoading /> : ''} isOpen={isOpen} onClick={() => setIsOpen((v) => !v)}>
		<ToolChildrenWrapper>
			<div className="!raccoon-select-text raccoon-cursor-auto">
				{children}
			</div>
		</ToolChildrenWrapper>
	</ToolHeaderWrapper>;
};


const loadingTitleWrapper = (item: React.ReactNode): React.ReactNode => {
	return <span className="raccoon-flex raccoon-items-center raccoon-flex-nowrap">
		{item}
		<IconLoading className="raccoon-w-3 raccoon-text-sm" />
	</span>;
};

const titleOfBuiltinToolName = {
	'read_file': { done: 'Read file', proposed: 'Read file', running: loadingTitleWrapper('Reading file') },
	'ls_dir': { done: 'Inspected folder', proposed: 'Inspect folder', running: loadingTitleWrapper('Inspecting folder') },
	'get_dir_tree': { done: 'Inspected folder tree', proposed: 'Inspect folder tree', running: loadingTitleWrapper('Inspecting folder tree') },
	'search_pathnames_only': { done: 'Searched by file name', proposed: 'Search by file name', running: loadingTitleWrapper('Searching by file name') },
	'search_for_files': { done: 'Searched', proposed: 'Search', running: loadingTitleWrapper('Searching') },
	'create_file_or_folder': { done: `Created`, proposed: `Create`, running: loadingTitleWrapper(`Creating`) },
	'delete_file_or_folder': { done: `Deleted`, proposed: `Delete`, running: loadingTitleWrapper(`Deleting`) },
	'edit_file': { done: `Edited file`, proposed: 'Edit file', running: loadingTitleWrapper('Editing file') },
	'rewrite_file': { done: `Wrote file`, proposed: 'Write file', running: loadingTitleWrapper('Writing file') },
	'run_command': { done: `Ran terminal`, proposed: 'Run terminal', running: loadingTitleWrapper('Running terminal') },
	'run_persistent_command': { done: `Ran terminal`, proposed: 'Run terminal', running: loadingTitleWrapper('Running terminal') },
	'open_persistent_terminal': { done: `Opened terminal`, proposed: 'Open terminal', running: loadingTitleWrapper('Opening terminal') },
	'kill_persistent_terminal': { done: `Killed terminal`, proposed: 'Kill terminal', running: loadingTitleWrapper('Killing terminal') },
	'read_lint_errors': { done: `Read lint errors`, proposed: 'Read lint errors', running: loadingTitleWrapper('Reading lint errors') },
	'search_in_file': { done: 'Searched in file', proposed: 'Search in file', running: loadingTitleWrapper('Searching in file') }
} as const satisfies Record<BuiltinToolName, { done: any; proposed: any; running: any; }>;


const getTitle = (toolMessage: Pick<ChatMessage & { role: 'tool'; }, 'name' | 'type' | 'mcpServerName'>): React.ReactNode => {
	const t = toolMessage;

	if (!builtinToolNames.includes(t.name as BuiltinToolName)) {
		const descriptor =
			t.type === 'success' ? 'Called' :
				t.type === 'running_now' ? 'Calling' :
					t.type === 'tool_request' ? 'Call' :
						t.type === 'rejected' ? 'Call' :
							t.type === 'invalid_params' ? 'Call' :
								t.type === 'tool_error' ? 'Call' :
									'Call';

		const title = `${descriptor} ${toolMessage.mcpServerName || 'MCP'}`;
		if (t.type === 'running_now' || t.type === 'tool_request')
			return loadingTitleWrapper(title);
		return title;
	} else {
		const toolName = t.name as BuiltinToolName;
		if (t.type === 'success') return titleOfBuiltinToolName[toolName].done;
		if (t.type === 'running_now') return titleOfBuiltinToolName[toolName].running;
		return titleOfBuiltinToolName[toolName].proposed;
	}
};


const toolNameToDesc = (toolName: BuiltinToolName, _toolParams: BuiltinToolCallParams[BuiltinToolName] | undefined, accessor: ReturnType<typeof useAccessor>): {
	desc1: React.ReactNode;
	desc1Info?: string;
} => {

	if (!_toolParams) {
		return { desc1: '' };
	}

	const x = {
		'read_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_file'];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'ls_dir': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['ls_dir'];
			return {
				desc1: getFolderName(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'search_pathnames_only': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_pathnames_only'];
			return { desc1: `"${toolParams.query}"` };
		},
		'search_for_files': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_for_files'];
			return { desc1: `"${toolParams.query}"` };
		},
		'search_in_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_in_file'];
			return {
				desc1: `"${toolParams.query}"`,
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'create_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['create_file_or_folder'];
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'delete_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['delete_file_or_folder'];
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'rewrite_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['rewrite_file'];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'edit_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['edit_file'];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'run_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_command'];
			return { desc1: `"${toolParams.command}"` };
		},
		'run_persistent_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_persistent_command'];
			return { desc1: `"${toolParams.command}"` };
		},
		'open_persistent_terminal': () => {
			return { desc1: '' };
		},
		'kill_persistent_terminal': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['kill_persistent_terminal'];
			return { desc1: toolParams.persistentTerminalId };
		},
		'get_dir_tree': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['get_dir_tree'];
			return {
				desc1: getFolderName(toolParams.uri.fsPath) ?? '/',
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		},
		'read_lint_errors': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_lint_errors'];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor)
			};
		}
	};

	try {
		return x[toolName]?.() || { desc1: '' };
	} catch {
		return { desc1: '' };
	}
};

const ToolRequestAcceptRejectButtons = ({ toolName }: { toolName: ToolName; }) => {
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');
	const metricsService = accessor.get('IMetricsService');
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const raccoonSettingsState = useSettingsState();

	const onAccept = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId;
			chatThreadsService.approveLatestToolRequest(threadId);
			metricsService.capture('Tool Request Accepted', {});
		} catch (e) { console.error('Error while approving message in chat:', e); }
	}, [chatThreadsService, metricsService]);

	const onReject = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId;
			chatThreadsService.rejectLatestToolRequest(threadId);
		} catch (e) { console.error('Error while approving message in chat:', e); }
		metricsService.capture('Tool Request Rejected', {});
	}, [chatThreadsService, metricsService]);

	const approveButton =
		<button
			onClick={onAccept}
			className={` raccoon-px-2 raccoon-py-1 raccoon-bg-[var(--vscode-button-background)] raccoon-text-[var(--vscode-button-foreground)] hover:raccoon-bg-[var(--vscode-button-hoverBackground)] raccoon-rounded raccoon-text-sm raccoon-font-medium `}>
			Approve
		</button>;

	const cancelButton =
		<button
			onClick={onReject}
			className={` raccoon-px-2 raccoon-py-1 raccoon-bg-[var(--vscode-button-secondaryBackground)] raccoon-text-[var(--vscode-button-secondaryForeground)] hover:raccoon-bg-[var(--vscode-button-secondaryHoverBackground)] raccoon-rounded raccoon-text-sm raccoon-font-medium `}>
			Cancel
		</button>;

	const approvalType = isABuiltinToolName(toolName) ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools';
	const approvalToggle = approvalType ? <div key={approvalType} className="raccoon-flex raccoon-items-center raccoon-ml-2 raccoon-gap-x-1">
		<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
	</div> : null;

	return <div className="raccoon-flex raccoon-gap-2 raccoon-mx-0.5 raccoon-items-center">
		{approveButton}
		{cancelButton}
		{approvalToggle}
	</div>;
};

export const ToolChildrenWrapper = ({ children, className }: { children: React.ReactNode; className?: string; }) => {
	return <div className={`${className ? className : ""} raccoon-cursor-default raccoon-select-none`}>
		<div className="raccoon-px-2 raccoon-min-w-full raccoon-overflow-hidden">
			{children}
		</div>
	</div>;
};

export const CodeChildren = ({ children, className }: { children: React.ReactNode; className?: string; }) => {
	return <div className={`${className ?? ''} raccoon-p-1 raccoon-rounded-sm raccoon-overflow-auto raccoon-text-sm`}>
		<div className="!raccoon-select-text raccoon-cursor-auto">
			{children}
		</div>
	</div>;
};

export const ListableToolItem = ({ name, onClick, isSmall, className, showDot }: { name: React.ReactNode; onClick?: () => void; isSmall?: boolean; className?: string; showDot?: boolean; }) => {
	return <div
		className={` ${onClick ? "hover:raccoon-brightness-125 hover:raccoon-cursor-pointer raccoon-transition-all raccoon-duration-200 " : ""} raccoon-flex raccoon-items-center raccoon-flex-nowrap raccoon-whitespace-nowrap ${className ? className : ""} `}
		onClick={onClick}>
		{showDot === false ? null : <div className="raccoon-flex-shrink-0"><svg className="raccoon-w-1 raccoon-h-1 raccoon-opacity-60 raccoon-mr-1.5 raccoon-fill-current" viewBox="0 0 100 40"><rect x="0" y="15" width="100" height="10" /></svg></div>}
		<div className={`${isSmall ? "raccoon-italic raccoon-text-raccoon-fg-4 raccoon-flex raccoon-items-center" : ""}`}>{name}</div>
	</div>;
};


const EditToolChildren = ({ uri, code, type }: { uri: URI | undefined; code: string; type: 'diff' | 'rewrite'; }) => {
	const content = type === 'diff'
		? <RaccoonDiffEditor uri={uri} searchReplaceBlocks={code} />
		: <ChatMarkdownRender string={`\`\`\`\n${code}\n\`\`\``} codeURI={uri} chatMessageLocation={undefined} />;

	return <div className="!raccoon-select-text raccoon-cursor-auto">
		<SmallProseWrapper>
			{content}
		</SmallProseWrapper>
	</div>;
};


const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[]; }) => {
	return <div className="raccoon-text-xs raccoon-text-raccoon-fg-4 raccoon-opacity-80 raccoon-border-l-2 raccoon-border-raccoon-warning raccoon-px-2 raccoon-py-0.5 raccoon-flex raccoon-flex-col raccoon-gap-0.5 raccoon-overflow-x-auto raccoon-whitespace-nowrap">
		{lintErrors.map((error, i) =>
			<div key={i}>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
		)}
	</div>;
};

const BottomChildren = ({ children, title }: { children: React.ReactNode; title: string; }) => {
	const [isOpen, setIsOpen] = useState(false);
	if (!children) return null;
	return (
		<div className="raccoon-w-full raccoon-px-2 raccoon-mt-0.5">
			<div
				className={`raccoon-flex raccoon-items-center raccoon-cursor-pointer raccoon-select-none raccoon-transition-colors raccoon-duration-150 raccoon-pl-0 raccoon-py-0.5 raccoon-rounded raccoon-group`}
				onClick={() => setIsOpen((o) => !o)}
				style={{ background: 'none' }}>
				<ChevronRight
					className={`raccoon-mr-1 raccoon-h-3 raccoon-w-3 raccoon-flex-shrink-0 raccoon-transition-transform raccoon-duration-100 raccoon-text-raccoon-fg-4 group-hover:raccoon-text-raccoon-fg-3 ${isOpen ? "raccoon-rotate-90" : ""}`} />
				<span className="raccoon-font-medium raccoon-text-raccoon-fg-4 group-hover:raccoon-text-raccoon-fg-3 raccoon-text-xs">{title}</span>
			</div>
			<div
				className={`raccoon-overflow-hidden raccoon-transition-all raccoon-duration-200 raccoon-ease-in-out ${isOpen ? "raccoon-opacity-100" : "raccoon-max-h-0 raccoon-opacity-0"} raccoon-text-xs raccoon-pl-4`}>
				<div className="raccoon-overflow-x-auto raccoon-text-raccoon-fg-4 raccoon-opacity-90 raccoon-border-l-2 raccoon-border-raccoon-warning raccoon-px-2 raccoon-py-0.5">
					{children}
				</div>
			</div>
		</div>);
};


const EditToolHeaderButtons = ({ applyBoxId, uri, codeStr, toolName, threadId }: { threadId: string; applyBoxId: string; uri: URI; codeStr: string; toolName: 'edit_file' | 'rewrite_file'; }) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri });
	return <div className="raccoon-flex raccoon-items-center raccoon-gap-1">
		{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName='Copy' />}
		<EditToolAcceptRejectButtonsHTML type={toolName} codeStr={codeStr} applyBoxId={applyBoxId} uri={uri} threadId={threadId} />
	</div>;
};


const InvalidTool = ({ toolName, message, mcpServerName }: { toolName: ToolName; message: string; mcpServerName: string | undefined; }) => {
	const accessor = useAccessor();
	const title = getTitle({ name: toolName, type: 'invalid_params', mcpServerName });
	const desc1 = 'Invalid parameters';
	const icon = null;
	const isError = true;
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon };

	componentParams.children = <ToolChildrenWrapper>
		<CodeChildren className="raccoon-bg-raccoon-bg-3">
			{message}
		</CodeChildren>
	</ToolChildrenWrapper>;
	return <ToolHeaderWrapper {...componentParams} />;
};

const CanceledTool = ({ toolName, mcpServerName }: { toolName: ToolName; mcpServerName: string | undefined; }) => {
	const accessor = useAccessor();
	const title = getTitle({ name: toolName, type: 'rejected', mcpServerName });
	const desc1 = '';
	const icon = null;
	const isRejected = true;
	const componentParams: ToolHeaderParams = { title, desc1, icon, isRejected };
	return <ToolHeaderWrapper {...componentParams} />;
};


const CommandTool = ({ toolMessage, type, threadId }: { threadId: string; } & (
	| { toolMessage: Exclude<ToolMessage<'run_command'>, { type: 'invalid_params'; }>; type: 'run_command'; }
	| { toolMessage: Exclude<ToolMessage<'run_persistent_command'>, { type: 'invalid_params'; }>; type: 'run_persistent_command'; }
)) => {
	const accessor = useAccessor();

	const commandService = accessor.get('ICommandService');
	const terminalToolsService = accessor.get('ITerminalToolService');
	const toolsService = accessor.get('IToolsService');
	const isError = false;
	const title = getTitle(toolMessage);
	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
	const icon = null;
	const streamState = useChatThreadsStreamState(threadId);

	const divRef = useRef<HTMLDivElement | null>(null);

	const isRejected = toolMessage.type === 'rejected';
	const { rawParams, params } = toolMessage;
	const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };


	const effect = async () => {
		if (streamState?.isRunning !== 'tool') return;
		if (type !== 'run_command' || toolMessage.type !== 'running_now') return;

		await streamState?.interrupt;
		const container = divRef.current;
		if (!container) return;

		const terminal = terminalToolsService.getTemporaryTerminal(toolMessage.params.terminalId);
		if (!terminal) return;

		try {
			terminal.attachToElement(container);
			terminal.setVisible(true);
		} catch { }

		const resizeObserver = new ResizeObserver((entries) => {
			const height = entries[0].borderBoxSize[0].blockSize;
			const width = entries[0].borderBoxSize[0].inlineSize;
			if (typeof terminal.layout === 'function') {
				terminal.layout({ width, height });
			}
		});

		resizeObserver.observe(container);
		return () => { terminal.detachFromElement(); resizeObserver?.disconnect(); };
	};

	useEffect(() => {
		effect();
	}, [terminalToolsService, toolMessage, toolMessage.type, type]);

	if (toolMessage.type === 'success') {
		const { result } = toolMessage;

		let msg: string;
		if (type === 'run_command') msg = toolsService.stringOfResult['run_command'](toolMessage.params, result); else
			msg = toolsService.stringOfResult['run_persistent_command'](toolMessage.params, result);

		if (type === 'run_persistent_command') {
			componentParams.info = persistentTerminalNameOfId(toolMessage.params.persistentTerminalId);
		}

		componentParams.children = <ToolChildrenWrapper className="raccoon-whitespace-pre raccoon-text-nowrap raccoon-overflow-auto raccoon-text-sm">
			<div className="!raccoon-select-text raccoon-cursor-auto">
				<BlockCode initValue={`${msg.trim()}`} language='shellscript' />
			</div>
		</ToolChildrenWrapper>;
	} else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage;
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>;
	} else if (toolMessage.type === 'running_now') {
		if (type === 'run_command')
			componentParams.children = <div ref={divRef} className="raccoon-relative raccoon-h-[300px] raccoon-text-sm" />;
	} else if (toolMessage.type === 'rejected' || toolMessage.type === 'tool_request') {
		// no extra UI needed
	}

	return <>
		<ToolHeaderWrapper {...componentParams} isOpen={type === 'run_command' && toolMessage.type === 'running_now' ? true : undefined} />
	</>;
};

type WrapperProps<T extends ToolName> = { toolMessage: Exclude<ToolMessage<T>, { type: 'invalid_params'; }>; messageIdx: number; threadId: string; };
const MCPToolWrapper = ({ toolMessage }: WrapperProps<string>) => {
	const accessor = useAccessor();
	const mcpService = accessor.get('IMCPService');

	const title = getTitle(toolMessage);
	const desc1 = removeMCPToolNamePrefix(toolMessage.name);
	const icon = null;

	if (toolMessage.type === 'running_now') return null;

	const isError = false;
	const isRejected = toolMessage.type === 'rejected';
	const { rawParams, params } = toolMessage;
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon, isRejected };

	const paramsStr = JSON.stringify(params, null, 2);
	componentParams.desc2 = <CopyButton codeStr={paramsStr} toolTipName={`Copy inputs: ${paramsStr}`} />;
	componentParams.info = !toolMessage.mcpServerName ? 'MCP tool not found' : undefined;

	if (toolMessage.type === 'success' || toolMessage.type === 'tool_request') {
		const { result } = toolMessage;
		const resultStr = result ? mcpService.stringifyResult(result) : 'null';
		componentParams.children = <ToolChildrenWrapper>
			<SmallProseWrapper>
				<ChatMarkdownRender
					string={`\`\`\`json\n${resultStr}\n\`\`\``}
					chatMessageLocation={undefined}
					isApplyEnabled={false}
					isLinkDetectionEnabled={true} />
			</SmallProseWrapper>
		</ToolChildrenWrapper>;
	} else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage;
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>;
	}

	return <ToolHeaderWrapper {...componentParams} />;
};

type ResultWrapper<T extends ToolName> = (props: WrapperProps<T>) => React.ReactNode;

const builtinToolNameToComponent: { [T in BuiltinToolName]: { resultWrapper: ResultWrapper<T>; } } = {
	'read_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');

			const title = getTitle(toolMessage);

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			let range: [number, number] | undefined = undefined;
			if (toolMessage.params.startLine !== null || toolMessage.params.endLine !== null) {
				const start = toolMessage.params.startLine === null ? `1` : `${toolMessage.params.startLine}`;
				const end = toolMessage.params.endLine === null ? `` : `${toolMessage.params.endLine}`;
				const addStr = `(${start}-${end})`;
				componentParams.desc1 += ` ${addStr}`;
				range = [params.startLine || 1, params.endLine || 1];
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor, range); };
				if (result.hasNextPage && params.pageNumber === 1)
					componentParams.desc2 = `(truncated after ${Math.round(MAX_FILE_CHARS_PAGE) / 1000}k)`;
				else if (params.pageNumber > 1)
					componentParams.desc2 = `(part ${params.pageNumber})`;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'get_dir_tree': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');

			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			if (params.uri) {
				const rel = getRelative(params.uri, accessor);
				if (rel) componentParams.info = `Only search in ${rel}`;
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				componentParams.children = <ToolChildrenWrapper>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={`\`\`\`\n${result.str}\n\`\`\``}
							chatMessageLocation={undefined}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true} />
					</SmallProseWrapper>
				</ToolChildrenWrapper>;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'ls_dir': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const explorerService = accessor.get('IExplorerService');
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			if (params.uri) {
				const rel = getRelative(params.uri, accessor);
				if (rel) componentParams.info = `Only search in ${rel}`;
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				componentParams.numResults = result.children?.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children = !result.children || (result.children.length ?? 0) === 0 ? undefined :
					<ToolChildrenWrapper>
						{result.children.map((child, i) => <ListableToolItem key={i}
							name={`${child.name}${child.isDirectory ? '/' : ''}`}
							className="raccoon-w-full raccoon-overflow-auto"
							onClick={() => { raccoonOpenFileFn(child.uri, accessor); }} />
						)}
						{result.hasNextPage &&
							<ListableToolItem name={`Results truncated (${result.itemsRemaining} remaining).`} isSmall={true} className="raccoon-w-full raccoon-overflow-auto" />
						}
					</ToolChildrenWrapper>;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'search_pathnames_only': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			if (params.includePattern) {
				componentParams.info = `Only search in ${params.includePattern}`;
			}

			if (toolMessage.type === 'success') {
				const { result, rawParams } = toolMessage;
				componentParams.numResults = result.uris.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children = result.uris.length === 0 ? undefined :
					<ToolChildrenWrapper>
						{result.uris.map((uri, i) => <ListableToolItem key={i}
							name={getBasename(uri.fsPath)}
							className="raccoon-w-full raccoon-overflow-auto"
							onClick={() => { raccoonOpenFileFn(uri, accessor); }} />
						)}
						{result.hasNextPage &&
							<ListableToolItem name={'Results truncated.'} isSmall={true} className="raccoon-w-full raccoon-overflow-auto" />
						}
					</ToolChildrenWrapper>;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'search_for_files': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			if (params.searchInFolder || params.isRegex) {
				let info: string[] = [];
				if (params.searchInFolder) {
					const rel = getRelative(params.searchInFolder, accessor);
					if (rel) info.push(`Only search in ${rel}`);
				}
				if (params.isRegex) { info.push(`Uses regex search`); }
				componentParams.info = info.join('; ');
			}

			if (toolMessage.type === 'success') {
				const { result, rawParams } = toolMessage;
				componentParams.numResults = result.uris.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children = result.uris.length === 0 ? undefined :
					<ToolChildrenWrapper>
						{result.uris.map((uri, i) => <ListableToolItem key={i}
							name={getBasename(uri.fsPath)}
							className="raccoon-w-full raccoon-overflow-auto"
							onClick={() => { raccoonOpenFileFn(uri, accessor); }} />
						)}
						{result.hasNextPage &&
							<ListableToolItem name={`Results truncated.`} isSmall={true} className="raccoon-w-full raccoon-overflow-auto" />
						}
					</ToolChildrenWrapper>;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}
			return <ToolHeaderWrapper {...componentParams} />;
		}
	},

	'search_in_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const toolsService = accessor.get('IToolsService');
			const title = getTitle(toolMessage);
			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			const infoarr: string[] = [];
			const uriStr = getRelative(params.uri, accessor);
			if (uriStr) infoarr.push(uriStr);
			if (params.isRegex) infoarr.push('Uses regex search');
			componentParams.info = infoarr.join('; ');

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				componentParams.numResults = result.lines.length;
				componentParams.children = result.lines.length === 0 ? undefined :
					<ToolChildrenWrapper>
						<CodeChildren className="raccoon-bg-raccoon-bg-3">
							<pre className="raccoon-font-mono raccoon-whitespace-pre">
								{toolsService.stringOfResult['search_in_file'](params, result)}
							</pre>
						</CodeChildren>
					</ToolChildrenWrapper>;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},

	'read_lint_errors': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');

			const title = getTitle(toolMessage);

			const { uri } = toolMessage.params ?? {};
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			componentParams.info = getRelative(uri, accessor);

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
				if (result.lintErrors)
					componentParams.children = <LintErrorChildren lintErrors={result.lintErrors} />;
				else
					componentParams.children = `No lint errors found.`;
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},

	'create_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			componentParams.info = getRelative(params.uri, accessor);

			if (toolMessage.type === 'success') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			} else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				if (params) { componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); }; }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			} else if (toolMessage.type === 'running_now') {
				// nothing more needed
			} else if (toolMessage.type === 'tool_request') {
				// nothing more needed
			}
			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'delete_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const isFolder = toolMessage.params?.isFolder ?? false;
			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			componentParams.info = getRelative(params.uri, accessor);

			if (toolMessage.type === 'success') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			} else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				if (params) { componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); }; }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			} else if (toolMessage.type === 'running_now') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			} else if (toolMessage.type === 'tool_request') {
				componentParams.onClick = () => { raccoonOpenFileFn(params.uri, accessor); };
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'rewrite_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.newContent} />;
		}
	},
	'edit_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.searchReplaceBlocks} />;
		}
	},
	'run_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_command' />;
		}
	},
	'run_persistent_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_persistent_command' />;
		}
	},
	'open_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const terminalToolsService = accessor.get('ITerminalToolService');

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const title = getTitle(toolMessage);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			const relativePath = params.cwd ? getRelative(URI.file(params.cwd), accessor) : '';
			componentParams.info = relativePath ? `Running in ${relativePath}` : undefined;

			if (toolMessage.type === 'success') {
				const { result } = toolMessage;
				const { persistentTerminalId } = result;
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId);
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId);
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},
	'kill_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get('ICommandService');
			const terminalToolsService = accessor.get('ITerminalToolService');

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const title = getTitle(toolMessage);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null;
			if (toolMessage.type === 'running_now') return null;

			const isError = false;
			const isRejected = toolMessage.type === 'rejected';
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected };

			if (toolMessage.type === 'success') {
				const { persistentTerminalId } = params;
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId);
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId);
			} else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>;
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	}
};


const Checkpoint = ({ message, threadId, messageIdx, isCheckpointGhost, threadIsRunning }: { message: CheckpointEntry; threadId: string; messageIdx: number; isCheckpointGhost: boolean; threadIsRunning: boolean; }) => {
	const accessor = useAccessor();
	const chatThreadService = accessor.get('IChatThreadService');
	const streamState = useFullChatThreadsStreamState();

	const isRunning = useChatThreadsStreamState(threadId)?.isRunning;
	const isDisabled = useMemo(() => {
		if (isRunning) return true;
		return !!Object.keys(streamState).find((threadId2) => streamState[threadId2]?.isRunning);
	}, [isRunning, streamState]);

	return <div className={`raccoon-flex raccoon-items-center raccoon-justify-center raccoon-px-2 `}>
		<div
			className={` raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-select-none ${isCheckpointGhost ? "raccoon-opacity-50" : "raccoon-opacity-100"} ${isDisabled ? "raccoon-cursor-default" : "raccoon-cursor-pointer"} `}
			style={{ position: 'relative', display: 'inline-block' }}
			onClick={() => {
				if (threadIsRunning) return;
				if (isDisabled) return;
				chatThreadService.jumpToCheckpointBeforeMessageIdx({
					threadId,
					messageIdx,
					jumpToUserModified: messageIdx === (chatThreadService.state.allThreads[threadId]?.messages.length ?? 0) - 1
				});
			}}
			{...isDisabled ? {
				'data-tooltip-id': 'raccoon-tooltip',
				'data-tooltip-content': `Disabled ${isRunning ? 'when running' : 'because another thread is running'}`,
				'data-tooltip-place': 'top'
			} : {}}>
			Checkpoint
		</div>
	</div>;
};


type ChatBubbleMode = 'display' | 'edit';
type ChatBubbleProps = {
	chatMessage: ChatMessage;
	messageIdx: number;
	isCommitted: boolean;
	chatIsRunning: IsRunningType;
	threadId: string;
	currCheckpointIdx: number | undefined;
	_scrollToBottom: (() => void) | null;
};

const ChatBubble = (props: ChatBubbleProps) => {
	return <ErrorBoundary>
		<_ChatBubble {...props} />
	</ErrorBoundary>;
};

// FIX: moved all hook calls (useAccessor) to the top of EditToolSoFar
// so they are not called conditionally after an early return.
const EditToolSoFar = ({ toolCallSoFar }: { toolCallSoFar: RawToolCallObj; }) => {
	// ALL hooks must be called unconditionally at the top
	const accessor = useAccessor();

	// Now it is safe to return early after all hooks have been called
	if (!isABuiltinToolName(toolCallSoFar.name)) return null;

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined;

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed;

	const uriDone = toolCallSoFar.doneParams.includes('uri');
	const desc1 = <span className="raccoon-flex raccoon-items-center">
		{uriDone
			? getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown')
			: `Generating`}
		<IconLoading />
	</span>;

	const desc1OnClick = () => { uri && raccoonOpenFileFn(uri, accessor); };

	return <ToolHeaderWrapper
		title={title}
		desc1={desc1}
		desc1OnClick={desc1OnClick}>
		<EditToolChildren
			uri={uri}
			code={toolCallSoFar.rawParams.search_replace_blocks ?? toolCallSoFar.rawParams.new_content ?? ''}
			type={'rewrite'}
		/>
		<IconLoading />
	</ToolHeaderWrapper>;
};

const _ChatBubble = ({ threadId, chatMessage, currCheckpointIdx, isCommitted, messageIdx, chatIsRunning, _scrollToBottom }: ChatBubbleProps) => {
	const role = chatMessage.role;

	const isCheckpointGhost = messageIdx > (currCheckpointIdx ?? Infinity) && !chatIsRunning;

	if (role === 'user') {
		return <UserMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			currCheckpointIdx={currCheckpointIdx}
			messageIdx={messageIdx}
			_scrollToBottom={_scrollToBottom} />;

	} else if (role === 'assistant') {
		return <AssistantMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			messageIdx={messageIdx}
			isCommitted={isCommitted} />;

	} else if (role === 'tool') {

		if (chatMessage.type === 'invalid_params') {
			return <div className={`${isCheckpointGhost ? "raccoon-opacity-50" : ""}`}>
				<InvalidTool toolName={chatMessage.name} message={chatMessage.content} mcpServerName={chatMessage.mcpServerName} />
			</div>;
		}

		const toolName = chatMessage.name;
		const isBuiltInTool = isABuiltinToolName(toolName);
		const ToolResultWrapper = isBuiltInTool
			? builtinToolNameToComponent[toolName]?.resultWrapper as ResultWrapper<ToolName>
			: MCPToolWrapper as ResultWrapper<ToolName>;

		if (ToolResultWrapper)
			return <>
				<div className={`${isCheckpointGhost ? "raccoon-opacity-50" : ""}`}>
					<ToolResultWrapper
						toolMessage={chatMessage}
						messageIdx={messageIdx}
						threadId={threadId} />
				</div>
				{chatMessage.type === 'tool_request'
					? <div className={`${isCheckpointGhost ? "raccoon-opacity-50 raccoon-pointer-events-none" : ""}`}>
						<ToolRequestAcceptRejectButtons toolName={chatMessage.name} />
					</div>
					: null}
			</>;
		return null;

	} else if (role === 'interrupted_streaming_tool') {
		return <div className={`${isCheckpointGhost ? "raccoon-opacity-50" : ""}`}>
			<CanceledTool toolName={chatMessage.name} mcpServerName={chatMessage.mcpServerName} />
		</div>;

	} else if (role === 'checkpoint') {
		return <Checkpoint
			threadId={threadId}
			message={chatMessage}
			messageIdx={messageIdx}
			isCheckpointGhost={isCheckpointGhost}
			threadIsRunning={!!chatIsRunning} />;
	}

	// FIX: explicit return null for unhandled roles
	return null;
};

const CommandBarInChat = () => {
	const { stateOfURI: commandBarStateOfURI, sortedURIs: sortedCommandBarURIs } = useCommandBarState();
	const numFilesChanged = sortedCommandBarURIs.length;

	const accessor = useAccessor();
	const editCodeService = accessor.get('IEditCodeService');
	const commandService = accessor.get('ICommandService');
	const chatThreadsState = useChatThreadsState();
	const commandBarState = useCommandBarState();
	const chatThreadsStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId);

	const [fileDetailsOpenedState, setFileDetailsOpenedState] = useState<'auto-opened' | 'auto-closed' | 'user-opened' | 'user-closed'>('auto-closed');
	const isFileDetailsOpened = fileDetailsOpenedState === 'auto-opened' || fileDetailsOpenedState === 'user-opened';

	useEffect(() => {
		if (numFilesChanged === 0) {
			setFileDetailsOpenedState('auto-closed');
		}
		if (numFilesChanged > 0 && fileDetailsOpenedState !== 'user-closed') {
			setFileDetailsOpenedState('auto-opened');
		}
	}, [fileDetailsOpenedState, setFileDetailsOpenedState, numFilesChanged]);

	const isFinishedMakingThreadChanges =
		commandBarState.sortedURIs.length !== 0
		&& commandBarState.sortedURIs.every((uri) => !commandBarState.stateOfURI[uri.fsPath]?.isStreaming);

	const threadStatus =
		chatThreadsStreamState?.isRunning === 'awaiting_user' ? { title: 'Needs Approval', color: 'yellow' } as const :
			chatThreadsStreamState?.isRunning ? { title: 'Running', color: 'orange' } as const :
				{ title: 'Done', color: 'dark' } as const;

	const threadStatusHTML = <StatusIndicator className="raccoon-mx-1" indicatorColor={threadStatus.color} title={threadStatus.title} />;

	const numFilesChangedStr = numFilesChanged === 0 ? 'No files with changes'
		: `${sortedCommandBarURIs.length} file${numFilesChanged === 1 ? '' : 's'} with changes`;

	const acceptRejectAllButtons = <div
		className={`raccoon-flex raccoon-items-center raccoon-gap-0.5 ${isFinishedMakingThreadChanges ? "" : "raccoon-opacity-0 raccoon-pointer-events-none"}`}>
		<IconShell1
			Icon={X}
			onClick={() => {
				sortedCommandBarURIs.forEach((uri) => {
					editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "reject", _addToHistory: true });
				});
			}}
			data-tooltip-id='raccoon-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Reject all' />
		<IconShell1
			Icon={Check}
			onClick={() => {
				sortedCommandBarURIs.forEach((uri) => {
					editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "accept", _addToHistory: true });
				});
			}}
			data-tooltip-id='raccoon-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Accept all' />
	</div>;

	const fileDetailsContent = <div className="raccoon-px-2 raccoon-gap-1 raccoon-w-full raccoon-overflow-y-auto">
		{sortedCommandBarURIs.map((uri, i) => {
			const basename = getBasename(uri.fsPath);

			const { sortedDiffIds, isStreaming } = commandBarStateOfURI[uri.fsPath] ?? {};
			const isFinishedMakingFileChanges = !isStreaming;

			const numDiffs = sortedDiffIds?.length || 0;

			const fileStatus = isFinishedMakingFileChanges
				? { title: 'Done', color: 'dark' } as const
				: { title: 'Running', color: 'orange' } as const;

			const fileNameHTML = <div
				className="raccoon-flex raccoon-items-center raccoon-gap-1.5 raccoon-text-raccoon-fg-3 hover:raccoon-brightness-125 raccoon-transition-all raccoon-duration-200 raccoon-cursor-pointer"
				onClick={() => raccoonOpenFileFn(uri, accessor)}>
				<span className="raccoon-text-raccoon-fg-3">{basename}</span>
			</div>;

			const detailsContent = <div className="raccoon-flex raccoon-px-4">
				<span className="raccoon-text-raccoon-fg-3 raccoon-opacity-80">{numDiffs} diff{numDiffs !== 1 ? 's' : ''}</span>
			</div>;

			const acceptRejectButtons = <div
				className={`raccoon-flex raccoon-items-center raccoon-gap-0.5 ${isFinishedMakingFileChanges ? "" : "raccoon-opacity-0 raccoon-pointer-events-none"} `}>
				<IconShell1
					Icon={X}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "reject", _addToHistory: true }); }}
					data-tooltip-id='raccoon-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Reject file' />
				<IconShell1
					Icon={Check}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "accept", _addToHistory: true }); }}
					data-tooltip-id='raccoon-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Accept file' />
			</div>;

			const fileStatusHTML = <StatusIndicator className="raccoon-mx-1" indicatorColor={fileStatus.color} title={fileStatus.title} />;

			return (
				<div key={i} className="raccoon-flex raccoon-justify-between raccoon-items-center">
					<div className="raccoon-flex raccoon-items-center">
						{fileNameHTML}
						{detailsContent}
					</div>
					<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
						{acceptRejectButtons}
						{fileStatusHTML}
					</div>
				</div>);
		})}
	</div>;

	const fileDetailsButton =
		<button
			className={`raccoon-flex raccoon-items-center raccoon-gap-1 raccoon-rounded ${numFilesChanged === 0 ? "raccoon-cursor-pointer" : "raccoon-cursor-pointer hover:raccoon-brightness-125 raccoon-transition-all raccoon-duration-200"}`}
			onClick={() => isFileDetailsOpened ? setFileDetailsOpenedState('user-closed') : setFileDetailsOpenedState('user-opened')}
			type='button'
			disabled={numFilesChanged === 0}>
			<svg
				className="raccoon-transition-transform raccoon-duration-200 raccoon-size-3.5"
				style={{
					transform: isFileDetailsOpened ? 'rotate(0deg)' : 'rotate(180deg)',
					transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
				}}
				xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline>
			</svg>
			{numFilesChangedStr}
		</button>;

	return (
		<>
			<div className="raccoon-px-2">
				<div
					className={` raccoon-select-none raccoon-flex raccoon-w-full raccoon-rounded-t-lg raccoon-bg-raccoon-bg-3 raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-text-nowrap raccoon-overflow-hidden raccoon-transition-all raccoon-duration-200 raccoon-ease-in-out ${isFileDetailsOpened ? "raccoon-max-h-24" : "raccoon-max-h-0"} `}>
					{fileDetailsContent}
				</div>
			</div>
			<div
				className={` raccoon-select-none raccoon-flex raccoon-w-full raccoon-rounded-t-lg raccoon-bg-raccoon-bg-3 raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-text-nowrap raccoon-border-t raccoon-border-l raccoon-border-r raccoon-border-zinc-300/10 raccoon-px-2 raccoon-py-1 raccoon-justify-between `}>
				<div className="raccoon-flex raccoon-gap-2 raccoon-items-center">
					{fileDetailsButton}
				</div>
				<div className="raccoon-flex raccoon-gap-2 raccoon-items-center">
					{acceptRejectAllButtons}
					{threadStatusHTML}
				</div>
			</div>
		</>);
};


export const SidebarChat = () => {
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const textAreaFnsRef = useRef<TextAreaFns | null>(null);

	const accessor = useAccessor();
	const commandService = accessor.get('ICommandService');
	const chatThreadsService = accessor.get('IChatThreadService');

	const settingsState = useSettingsState();

	const chatThreadsState = useChatThreadsState();

	const currentThread = chatThreadsService.getCurrentThread();
	const previousMessages = currentThread?.messages ?? [];

	const selections = currentThread?.state.stagingSelections ?? [];
	const setSelections = (s: StagingSelectionItem[]) => { chatThreadsService.setCurrentThreadState({ stagingSelections: s }); };

	const currThreadStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId);
	const isRunning = currThreadStreamState?.isRunning;
	const latestError = currThreadStreamState?.error;
	const { displayContentSoFar, toolCallSoFar, reasoningSoFar } = currThreadStreamState?.llmInfo ?? {};

	const toolIsGenerating = toolCallSoFar && !toolCallSoFar.isDone;

	const initVal = '';
	const [instructionsAreEmpty, setInstructionsAreEmpty] = useState(!initVal);

	const isDisabled = instructionsAreEmpty || !!isFeatureNameDisabled('Chat', settingsState);

	const sidebarRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const onSubmit = useCallback(async (_forceSubmit?: string) => {
		if (isDisabled && !_forceSubmit) return;
		if (isRunning) return;

		const threadId = chatThreadsService.state.currentThreadId;
		if (!threadId) {
			console.error('Current thread should never be undefined');
			return;
		}

		const userMessage = _forceSubmit || textAreaRef.current?.value || '';

		try {
			await chatThreadsService.addUserMessageAndStreamResponse({ userMessage, threadId });
		} catch (e) {
			console.error('Error while sending message in chat:', e);
		}

		setSelections([]);
		textAreaFnsRef.current?.setValue('');
		textAreaRef.current?.focus();
	}, [chatThreadsService, isDisabled, isRunning, textAreaRef, textAreaFnsRef, setSelections, settingsState]);

	const onAbort = async () => {
		const threadId = currentThread?.id;
		if (threadId) await chatThreadsService.abortRunning(threadId);
	};

	const keybindingString = accessor.get('IKeybindingService').lookupKeybinding(raccoon_CTRL_L_ACTION_ID)?.getLabel();

	const threadId = currentThread?.id;
	const currCheckpointIdx = threadId ? (chatThreadsState.allThreads[threadId]?.state?.currCheckpointIdx ?? undefined) : undefined;

	const isResolved = threadId ? chatThreadsState.allThreads[threadId]?.state.mountedInfo?.mountedIsResolvedRef.current : undefined;
	useEffect(() => {
		if (!threadId) return;
		if (isResolved) return;
		chatThreadsState.allThreads[threadId]?.state.mountedInfo?._whenMountedResolver?.({
			textAreaRef: textAreaRef,
			scrollToBottom: () => scrollToBottom(scrollContainerRef)
		});
	}, [chatThreadsState, threadId, textAreaRef, scrollContainerRef, isResolved]);


	const previousMessagesHTML = useMemo(() => {
		return previousMessages.map((message, i) => {
			return <ChatBubble
				key={i}
				currCheckpointIdx={currCheckpointIdx}
				chatMessage={message}
				messageIdx={i}
				isCommitted={true}
				chatIsRunning={isRunning}
				threadId={threadId ?? ''}
				_scrollToBottom={() => scrollToBottom(scrollContainerRef)} />;
		});
	}, [previousMessages, threadId, currCheckpointIdx, isRunning]);

	const streamingChatIdx = previousMessagesHTML.length;
	const currStreamingMessageHTML = reasoningSoFar || displayContentSoFar || isRunning
		? <ChatBubble
			key={'curr-streaming-msg'}
			currCheckpointIdx={currCheckpointIdx}
			chatMessage={{
				role: 'assistant',
				displayContent: displayContentSoFar ?? '',
				reasoning: reasoningSoFar ?? '',
				anthropicReasoning: null
			}}
			messageIdx={streamingChatIdx}
			isCommitted={false}
			chatIsRunning={isRunning}
			threadId={threadId ?? ''}
			_scrollToBottom={null} />
		: null;

	const generatingTool = toolIsGenerating
		? toolCallSoFar.name === 'edit_file' || toolCallSoFar.name === 'rewrite_file'
			? <EditToolSoFar
				key={'curr-streaming-tool'}
				toolCallSoFar={toolCallSoFar} />
			: null
		: null;

	const messagesHTML = <ScrollToBottomContainer
		key={'messages' + chatThreadsState.currentThreadId}
		scrollContainerRef={scrollContainerRef}
		className={` raccoon-flex raccoon-flex-col raccoon-px-4 raccoon-py-4 raccoon-space-y-4 raccoon-w-full raccoon-h-full raccoon-overflow-x-hidden raccoon-overflow-y-auto raccoon-relative ${previousMessagesHTML.length === 0 && !displayContentSoFar ? "raccoon-hidden" : ""} `}>

		<div className="raccoon-chat-watermark" />
		{previousMessagesHTML}
		{currStreamingMessageHTML}

		{generatingTool}

		{isRunning === 'LLM' || isRunning === 'idle' && !toolIsGenerating ? <ProseWrapper>
			{<IconLoading className="raccoon-opacity-50 raccoon-text-sm" />}
		</ProseWrapper> : null}

		{latestError === undefined ? null :
			<div className="raccoon-px-2 raccoon-my-1">
				<ErrorDisplay
					message={latestError.message}
					fullError={latestError.fullError}
					onDismiss={() => { if (currentThread?.id) chatThreadsService.dismissStreamError(currentThread.id); }}
					showDismiss={true} />
				<WarningBox className="raccoon-text-sm raccoon-my-2 raccoon-mx-4" onClick={() => { commandService.executeCommand(raccoon_OPEN_SETTINGS_ACTION_ID); }} text='Open settings' />
			</div>
		}
	</ScrollToBottomContainer>;

	const onChangeText = useCallback((newStr: string) => {
		setInstructionsAreEmpty(!newStr);
	}, [setInstructionsAreEmpty]);

	const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			onSubmit();
		} else if (e.key === 'Escape' && isRunning) {
			onAbort();
		}
	}, [onSubmit, onAbort, isRunning]);

	const chatMode = settingsState.globalSettings.chatMode;
	const modeTitle = chatMode.charAt(0).toUpperCase() + chatMode.slice(1);

	const inputChatArea = <RaccoonChatArea
		featureName='Chat'
		onSubmit={() => onSubmit()}
		onAbort={onAbort}
		onNewThread={() => chatThreadsService.openNewThread()}
		isStreaming={!!isRunning}
		isDisabled={isDisabled}
		showSelections={true}
		selections={selections}
		setSelections={setSelections}
		onClickAnywhere={() => { textAreaRef.current?.focus(); }}>
		<RaccoonInputBox2
			enableAtToMention
			className={`raccoon-min-h-[81px] raccoon-px-0.5 raccoon-py-0.5`}
			placeholder={`@ to mention, ${keybindingString ? `${keybindingString} to add a selection. ` : ''}Enter instructions...`}
			onChangeText={onChangeText}
			onKeyDown={onKeyDown}
			onFocus={() => { chatThreadsService.setCurrentlyFocusedMessageIdx(undefined); }}
			ref={textAreaRef}
			fnsRef={textAreaFnsRef}
			multiline={true} />
	</RaccoonChatArea>;

	const isLandingPage = previousMessages.length === 0;

	const initiallySuggestedPromptsHTML = <div className="raccoon-flex raccoon-flex-col raccoon-gap-2 raccoon-w-full raccoon-text-nowrap raccoon-text-raccoon-fg-3 raccoon-select-none">
		{[
			'Summarize my codebase',
			'How do types work in Rust?',
			'Create a .raccoonrules file for me'].map((text, index) =>
				<div
					key={index}
					className="raccoon-py-1 raccoon-px-2 raccoon-rounded raccoon-text-sm raccoon-bg-zinc-700/5 hover:raccoon-bg-zinc-700/10 dark:raccoon-bg-zinc-300/5 dark:hover:raccoon-bg-zinc-300/10 raccoon-cursor-pointer raccoon-opacity-80 hover:raccoon-opacity-100"
					onClick={() => onSubmit(text)}>
					{text}
				</div>
		)}
	</div>;

	const threadPageInput = <div key={'input' + chatThreadsState.currentThreadId}>
		<div className="raccoon-px-4">
			<CommandBarInChat />
		</div>
		<div className="raccoon-px-2 raccoon-pb-2">
			{inputChatArea}
		</div>
	</div>;

	const landingPageInput = <div>
		<div className="raccoon-pt-8">
			{inputChatArea}
		</div>
	</div>;

	const workspaceContextService = accessor.get('IWorkspaceContextService');
	const workspaceName = workspaceContextService.getWorkspace().folders[0]?.name ?? 'Raccoon AI';

	const landingPageContent = <div
		ref={sidebarRef}
		className="raccoon-w-full raccoon-h-full raccoon-max-h-full raccoon-flex raccoon-flex-col raccoon-overflow-hidden raccoon-relative">
		<div className="raccoon-chat-watermark" />
		
		<div className="raccoon-flex-1 raccoon-flex raccoon-flex-col raccoon-items-center raccoon-justify-center raccoon-px-4 raccoon-overflow-y-auto">
			<div className="raccoon-mb-8 raccoon-text-center">
				<div className="raccoon-text-raccoon-fg-1 raccoon-text-xl raccoon-font-bold">{workspaceName}</div>
				<div className="raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-opacity-60">{modeTitle}</div>
			</div>

			<ErrorBoundary>
				<div className="raccoon-w-full raccoon-max-w-[500px]">
					{landingPageInput}
				</div>
			</ErrorBoundary>

			<div className="raccoon-w-full raccoon-max-w-[500px] raccoon-mt-10">
				{Object.keys(chatThreadsState.allThreads).length > 1
					? <ErrorBoundary>
						<div className="raccoon-flex raccoon-flex-col raccoon-gap-2">
							<PastThreadsList />
							<div className="raccoon-mt-2 raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-cursor-pointer hover:raccoon-underline">See all</div>
						</div>
					</ErrorBoundary>
					: <ErrorBoundary>
						<div className="raccoon-mb-3 raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-font-medium raccoon-opacity-60">Suggestions</div>
						{initiallySuggestedPromptsHTML}
					</ErrorBoundary>
				}
			</div>
		</div>

		<div className="raccoon-py-4 raccoon-px-4 raccoon-text-[10px] raccoon-text-raccoon-fg-4 raccoon-text-center raccoon-opacity-50">
			AI may make mistakes. Double-check all generated code.
		</div>
	</div>;

	const threadPageContent = <div
		ref={sidebarRef}
		className="raccoon-w-full raccoon-h-full raccoon-flex raccoon-flex-col raccoon-overflow-hidden">
		<ErrorBoundary>
			{messagesHTML}
		</ErrorBoundary>
		<ErrorBoundary>
			{threadPageInput}
		</ErrorBoundary>
	</div>;



	return (
		<div className="raccoon-flex raccoon-flex-col raccoon-h-full raccoon-w-full raccoon-bg-raccoon-bg-1">
			<div className="raccoon-flex-1 raccoon-overflow-hidden">
				<Fragment key={threadId}>
					{isLandingPage ? landingPageContent : threadPageContent}
				</Fragment>
			</div>
		</div>
	);
};
