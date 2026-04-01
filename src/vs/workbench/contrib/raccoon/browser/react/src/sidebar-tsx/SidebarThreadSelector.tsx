/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useMemo, useState } from 'react';
import { CopyButton, IconShell1 } from '../markdown/ApplyBlockHoverButtons.js';
import { useAccessor, useChatThreadsState, useChatThreadsStreamState, useFullChatThreadsStreamState, useSettingsState } from '../util/services.js';
import { getRelativeTime, IconX } from './SidebarChat.js';
import { Check, Copy, Icon, LoaderCircle, MessageCircleQuestion, Trash2, UserCheck, X } from 'lucide-react';
import { IsRunningType, ThreadType } from '../../../chatThreadService.js';


const numInitialThreads = 5;

const DuplicateButton = ({ threadId }: { threadId: string; }) => {
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');
	return <IconShell1
		Icon={Copy}
		className="raccoon-size-[11px]"
		onClick={() => { chatThreadsService.duplicateThread(threadId); }}
		data-tooltip-id='raccoon-tooltip'
		data-tooltip-place='top'
		data-tooltip-content='Duplicate thread'>
	</IconShell1>;
};

const TrashButton = ({ threadId }: { threadId: string; }) => {
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');
	const [isTrashPressed, setIsTrashPressed] = useState(false);

	return isTrashPressed ?
		<div className="raccoon-flex raccoon-flex-nowrap raccoon-text-nowrap raccoon-gap-1">
			<IconShell1
				Icon={X}
				className="raccoon-size-[11px]"
				onClick={() => { setIsTrashPressed(false); }}
				data-tooltip-id='raccoon-tooltip'
				data-tooltip-place='top'
				data-tooltip-content='Cancel' />
			<IconShell1
				Icon={Check}
				className="raccoon-size-[11px]"
				onClick={() => { chatThreadsService.deleteThread(threadId); setIsTrashPressed(false); }}
				data-tooltip-id='raccoon-tooltip'
				data-tooltip-place='top'
				data-tooltip-content='Confirm' />
		</div> :
		<IconShell1
			Icon={Trash2}
			className="raccoon-size-[11px]"
			onClick={() => { setIsTrashPressed(true); }}
			data-tooltip-id='raccoon-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Delete thread' />;
};

export const PastThreadsList = ({ className = '' }: { className?: string; }) => {
	const [showAll, setShowAll] = useState(false);
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

	const threadsState = useChatThreadsState();
	const { allThreads } = threadsState;

	const streamState = useFullChatThreadsStreamState();

	const runningThreadIds: { [threadId: string]: IsRunningType | undefined; } = {};
	for (const threadId in streamState) {
		const isRunning = streamState[threadId]?.isRunning;
		if (isRunning) { runningThreadIds[threadId] = isRunning; }
	}

	if (!allThreads) {
		return <div key="error" className="raccoon-p-1">{`Error accessing chat history.`}</div>;
	}

	// sorted by most recent to least recent
	const sortedThreadIds = Object.keys(allThreads ?? {}).
		sort((threadId1, threadId2) => (allThreads[threadId1]?.lastModified ?? 0) > (allThreads[threadId2]?.lastModified ?? 0) ? -1 : 1).
		filter((threadId) => (allThreads![threadId]?.messages.length ?? 0) !== 0);

	// Get only first few threads if not showing all
	const displayThreads = showAll ? sortedThreadIds : sortedThreadIds.slice(0, numInitialThreads);
	const hasMoreThreads = sortedThreadIds.length > numInitialThreads;

	return (
		<div className={`raccoon-flex raccoon-flex-col raccoon-gap-1 raccoon-w-full raccoon-text-nowrap raccoon-text-raccoon-fg-3 raccoon-select-none raccoon-relative ${className}`}>
			{displayThreads.map((threadId, i) => {
				const pastThread = allThreads[threadId];
				if (!pastThread) return null;

				return (
					<PastThreadElement
						key={pastThread.id}
						pastThread={pastThread}
						idx={i}
						hoveredIdx={hoveredIdx}
						setHoveredIdx={setHoveredIdx}
						isRunning={runningThreadIds[pastThread.id]} />);
			})}

			{hasMoreThreads && !showAll &&
				<div
					className="raccoon-mt-2 raccoon-text-raccoon-fg-3 raccoon-opacity-60 hover:raccoon-opacity-100 hover:raccoon-underline raccoon-cursor-pointer raccoon-text-[10px]"
					onClick={() => setShowAll(true)}>
					See all
				</div>
			}
		</div>);
};

const PastThreadElement = ({ pastThread, idx, hoveredIdx, setHoveredIdx, isRunning }: { pastThread: ThreadType; idx: number; hoveredIdx: number | null; setHoveredIdx: (idx: number | null) => void; isRunning: IsRunningType | undefined; }) => {
	const accessor = useAccessor();
	const chatThreadsService = accessor.get('IChatThreadService');

	let firstMsg = '';
	const firstUserMsg = pastThread.messages.find((msg) => msg.role === 'user');

	if (firstUserMsg && 'displayContent' in firstUserMsg) {
		firstMsg = firstUserMsg.displayContent || '';
	} else {
		firstMsg = 'New Thread';
	}

	const timeHTML = <span className="raccoon-text-[10px] raccoon-text-raccoon-fg-4 raccoon-opacity-60 raccoon-flex-shrink-0">
		{getRelativeTime(pastThread.lastModified)}
	</span>;

	return <div
		key={pastThread.id}
		className={` raccoon-py-1.5 raccoon-px-2 raccoon-rounded-md raccoon-text-sm hover:raccoon-bg-raccoon-bg-2 raccoon-cursor-pointer raccoon-transition-colors `}
		onClick={() => {
			chatThreadsService.switchToThread(pastThread.id);
		}}
		onMouseEnter={() => setHoveredIdx(idx)}
		onMouseLeave={() => setHoveredIdx(null)}>

		<div className="raccoon-flex raccoon-items-center raccoon-justify-between raccoon-gap-3">
			<span className="raccoon-flex raccoon-items-center raccoon-gap-2 raccoon-min-w-0 raccoon-overflow-hidden">
				{isRunning && <LoaderCircle className="raccoon-animate-spin raccoon-text-raccoon-fg-3" size={14} />}
				<span className="raccoon-truncate raccoon-text-raccoon-fg-2 font-medium">
					{firstMsg}
				</span>
			</span>

			<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2">
				{idx === hoveredIdx ?
					<div className="raccoon-flex raccoon-items-center raccoon-gap-1">
						<DuplicateButton threadId={pastThread.id} />
						<TrashButton threadId={pastThread.id} />
					</div> :
					timeHTML
				}
			</div>
		</div>
	</div>;
};