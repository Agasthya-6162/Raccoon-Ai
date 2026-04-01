/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useCommandBarState, useIsDark } from '../util/services.js';

import '../styles.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from '../../../../common/helpers/colors.js';
import { raccoonCommandBarProps } from '../../../raccoonCommandBarService.js';
import { Check, EllipsisVertical, Menu, MoveDown, MoveLeft, MoveRight, MoveUp, X } from 'lucide-react';
import {
  raccoon_GOTO_NEXT_DIFF_ACTION_ID,
  raccoon_GOTO_PREV_DIFF_ACTION_ID,
  raccoon_GOTO_NEXT_URI_ACTION_ID,
  raccoon_GOTO_PREV_URI_ACTION_ID,
  raccoon_ACCEPT_FILE_ACTION_ID,
  raccoon_REJECT_FILE_ACTION_ID,
  raccoon_ACCEPT_ALL_DIFFS_ACTION_ID,
  raccoon_REJECT_ALL_DIFFS_ACTION_ID } from
'../../../actionIDs.js';

export const raccoonCommandBarMain = ({ uri, editor }: raccoonCommandBarProps) => {
  const isDark = useIsDark();

  return <div
    className={`raccoon-scope ${isDark ? "raccoon-dark" : ""}`}>

		<RaccoonCommandBar uri={uri} editor={editor} />
	</div>;
};



export const AcceptAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` raccoon-px-2 raccoon-py-0.5 raccoon-flex raccoon-items-center raccoon-gap-1 raccoon-text-white raccoon-text-[11px] raccoon-text-nowrap raccoon-h-full raccoon-rounded-none raccoon-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>

		{text ? <span>{text}</span> : <Check size={16} />}
	</button>;


export const RejectAllButtonWrapper = ({ text, onClick, className, ...props }: {text: string;onClick: () => void;className?: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
  className={` raccoon-px-2 raccoon-py-0.5 raccoon-flex raccoon-items-center raccoon-gap-1 raccoon-text-white raccoon-text-[11px] raccoon-text-nowrap raccoon-h-full raccoon-rounded-none raccoon-cursor-pointer ${





  className} `}

  style={{
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    border: 'none'
  }}
  type='button'
  onClick={onClick}
  {...props}>

		{text ? <span>{text}</span> : <X size={16} />}
	</button>;




export const RaccoonCommandBar = ({ uri, editor }: raccoonCommandBarProps) => {
  const accessor = useAccessor();
  const editCodeService = accessor.get('IEditCodeService');
  const editorService = accessor.get('ICodeEditorService');
  const metricsService = accessor.get('IMetricsService');
  const commandService = accessor.get('ICommandService');
  const commandBarService = accessor.get('IRaccoonCommandBarService');
  const raccoonModelService = accessor.get('IRaccoonModelService');
  const keybindingService = accessor.get('IKeybindingService');
  const { stateOfURI: commandBarState, sortedURIs: sortedCommandBarURIs } = useCommandBarState();
  const [showAcceptRejectAllButtons, setShowAcceptRejectAllButtons] = useState(false);

  // latestUriIdx is used to remember place in leftRight
  const _latestValidUriIdxRef = useRef<number | null>(null);

  // i is the current index of the URI in sortedCommandBarURIs
  const i_ = sortedCommandBarURIs.findIndex((e) => e.fsPath === uri?.fsPath);
  const currFileIdx = i_ === -1 ? null : i_;
  useEffect(() => {
    if (currFileIdx !== null) _latestValidUriIdxRef.current = currFileIdx;
  }, [currFileIdx]);

  const uriIdxInStepper = currFileIdx !== null ? currFileIdx // use currFileIdx if it exists, else use latestNotNullUriIdxRef
  : _latestValidUriIdxRef.current === null ? null :
  _latestValidUriIdxRef.current < sortedCommandBarURIs.length ? _latestValidUriIdxRef.current :
  null;

  // when change URI, scroll to the proper spot
  useEffect(() => {
    setTimeout(() => {
      // check undefined
      if (!uri) return;
      const s = commandBarService.stateOfURI[uri.fsPath];
      if (!s) return;
      const { diffIdx } = s;
      commandBarService.goToDiffIdx(diffIdx ?? 0);
    }, 50);
  }, [uri, commandBarService]);

  if (uri?.scheme !== 'file') return null; // don't show in editors that we made, they must be files

  // Using service methods directly

  const currDiffIdx = uri ? commandBarState[uri.fsPath]?.diffIdx ?? null : null;
  const sortedDiffIds = uri ? commandBarState[uri.fsPath]?.sortedDiffIds ?? [] : [];
  const sortedDiffZoneIds = uri ? commandBarState[uri.fsPath]?.sortedDiffZoneIds ?? [] : [];

  const isADiffInThisFile = sortedDiffIds.length !== 0;
  const isADiffZoneInThisFile = sortedDiffZoneIds.length !== 0;
  const isADiffZoneInAnyFile = sortedCommandBarURIs.length !== 0;

  const streamState = uri ? commandBarService.getStreamState(uri) : null;
  const showAcceptRejectAll = streamState === 'idle-has-changes';

  const nextDiffIdx = commandBarService.getNextDiffIdx(1);
  const prevDiffIdx = commandBarService.getNextDiffIdx(-1);
  const nextURIIdx = commandBarService.getNextUriIdx(1);
  const prevURIIdx = commandBarService.getNextUriIdx(-1);

  const upDownDisabled = prevDiffIdx === null || nextDiffIdx === null;
  const leftRightDisabled = prevURIIdx === null || nextURIIdx === null;

  // accept/reject if current URI has changes
  const onAcceptFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'accept', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Accept File', {});
  };
  const onRejectFile = () => {
    if (!uri) return;
    editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior: 'reject', removeCtrlKs: false, _addToHistory: true });
    metricsService.capture('Reject File', {});
  };

  const onAcceptAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'accept' });
    metricsService.capture('Accept All', {});
    setShowAcceptRejectAllButtons(false);
  };

  const onRejectAll = () => {
    commandBarService.acceptOrRejectAllFiles({ behavior: 'reject' });
    metricsService.capture('Reject All', {});
    setShowAcceptRejectAllButtons(false);
  };



  const _upKeybinding = keybindingService.lookupKeybinding(raccoon_GOTO_PREV_DIFF_ACTION_ID);
  const _downKeybinding = keybindingService.lookupKeybinding(raccoon_GOTO_NEXT_DIFF_ACTION_ID);
  const _leftKeybinding = keybindingService.lookupKeybinding(raccoon_GOTO_PREV_URI_ACTION_ID);
  const _rightKeybinding = keybindingService.lookupKeybinding(raccoon_GOTO_NEXT_URI_ACTION_ID);
  const _acceptFileKeybinding = keybindingService.lookupKeybinding(raccoon_ACCEPT_FILE_ACTION_ID);
  const _rejectFileKeybinding = keybindingService.lookupKeybinding(raccoon_REJECT_FILE_ACTION_ID);
  const _acceptAllKeybinding = keybindingService.lookupKeybinding(raccoon_ACCEPT_ALL_DIFFS_ACTION_ID);
  const _rejectAllKeybinding = keybindingService.lookupKeybinding(raccoon_REJECT_ALL_DIFFS_ACTION_ID);

  const upKeybindLabel = editCodeService.processRawKeybindingText(_upKeybinding?.getLabel() || '');
  const downKeybindLabel = editCodeService.processRawKeybindingText(_downKeybinding?.getLabel() || '');
  const leftKeybindLabel = editCodeService.processRawKeybindingText(_leftKeybinding?.getLabel() || '');
  const rightKeybindLabel = editCodeService.processRawKeybindingText(_rightKeybinding?.getLabel() || '');
  const acceptFileKeybindLabel = editCodeService.processRawKeybindingText(_acceptFileKeybinding?.getAriaLabel() || '');
  const rejectFileKeybindLabel = editCodeService.processRawKeybindingText(_rejectFileKeybinding?.getAriaLabel() || '');
  const acceptAllKeybindLabel = editCodeService.processRawKeybindingText(_acceptAllKeybinding?.getAriaLabel() || '');
  const rejectAllKeybindLabel = editCodeService.processRawKeybindingText(_rejectAllKeybinding?.getAriaLabel() || '');


  if (!isADiffZoneInAnyFile) return null;

  // For pages without a current file index, show a simplified command bar
  if (currFileIdx === null) {
    return (
      <div className="raccoon-pointer-events-auto">
				<div className="raccoon-flex raccoon-bg-raccoon-bg-2 raccoon-shadow-md raccoon-border raccoon-border-raccoon-border-2 [&>*:first-child]:raccoon-pl-3 [&>*:last-child]:raccoon-pr-3 [&>*]:raccoon-border-r [&>*]:raccoon-border-raccoon-border-2 [&>*:last-child]:raccoon-border-r-0">
					<div className="raccoon-flex raccoon-items-center raccoon-px-3">
						<span className="raccoon-text-xs raccoon-whitespace-nowrap">
							{`${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'} changed`}
						</span>
					</div>
					<button
            className="raccoon-text-xs raccoon-whitespace-nowrap raccoon-cursor-pointer raccoon-flex raccoon-items-center raccoon-justify-center raccoon-gap-1 raccoon-bg-[var(--vscode-button-background)] raccoon-text-[var(--vscode-button-foreground)] hover:raccoon-opacity-90 raccoon-h-full raccoon-px-3"
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}>

						Next <MoveRight className="raccoon-size-3 raccoon-my-1" />
					</button>
				</div>
			</div>);

  }

  return (
    <div className="raccoon-pointer-events-auto">


			{/* Accept All / Reject All buttons that appear when the vertical ellipsis is clicked */}
			{showAcceptRejectAllButtons && showAcceptRejectAll &&
      <div className="raccoon-flex raccoon-justify-end raccoon-mb-1">
					<div className="raccoon-inline-flex raccoon-bg-raccoon-bg-2 raccoon-rounded raccoon-shadow-md raccoon-border raccoon-border-raccoon-border-2 raccoon-overflow-hidden">
						<div className="raccoon-flex raccoon-items-center [&>*]:raccoon-border-r [&>*]:raccoon-border-raccoon-border-2 [&>*:last-child]:raccoon-border-r-0">
							<AcceptAllButtonWrapper
            // text={`Accept All${acceptAllKeybindLabel ? ` ${acceptAllKeybindLabel}` : ''}`}
            text={`Accept All`}
            data-tooltip-id='raccoon-tooltip'
            data-tooltip-content={acceptAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onAcceptAll} />

							<RejectAllButtonWrapper
            // text={`Reject All${rejectAllKeybindLabel ? ` ${rejectAllKeybindLabel}` : ''}`}
            text={`Reject All`}
            data-tooltip-id='raccoon-tooltip'
            data-tooltip-content={rejectAllKeybindLabel}
            data-tooltip-delay-show={500}
            onClick={onRejectAll} />

						</div>
					</div>
				</div>
      }

			<div className="raccoon-flex raccoon-items-center raccoon-bg-raccoon-bg-2 raccoon-rounded raccoon-shadow-md raccoon-border raccoon-border-raccoon-border-2 [&>*:first-child]:raccoon-pl-3 [&>*:last-child]:raccoon-pr-3 [&>*]:raccoon-px-3 [&>*]:raccoon-border-r [&>*]:raccoon-border-raccoon-border-2 [&>*:last-child]:raccoon-border-r-0">

				{/* Diff Navigation Group */}
				<div className="raccoon-flex raccoon-items-center raccoon-py-0.5">
					<button
            className="raccoon-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(prevDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(prevDiffIdx);
              }
            }}
            data-tooltip-id="raccoon-tooltip"
            data-tooltip-content={`${upKeybindLabel ? `${upKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveUp className="raccoon-size-3 raccoon-transition-opacity raccoon-duration-200 raccoon-opacity-70 hover:raccoon-opacity-100" />
					</button>
					<span className={`raccoon-text-xs raccoon-whitespace-nowrap raccoon-px-1 ${!isADiffInThisFile ? "raccoon-opacity-70" : ""}`}>
						{isADiffInThisFile ?
            `Diff ${(currDiffIdx ?? 0) + 1} of ${sortedDiffIds.length}` :
            streamState === 'streaming' ?
            'No changes yet' :
            'No changes'
            }

					</span>
					<button
            className="raccoon-cursor-pointer"
            disabled={upDownDisabled}
            onClick={() => commandBarService.goToDiffIdx(nextDiffIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToDiffIdx(nextDiffIdx);
              }
            }}
            data-tooltip-id="raccoon-tooltip"
            data-tooltip-content={`${downKeybindLabel ? `${downKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveDown className="raccoon-size-3 raccoon-transition-opacity raccoon-duration-200 raccoon-opacity-70 hover:raccoon-opacity-100" />
					</button>
				</div>



				{/* File Navigation Group */}
				<div className="raccoon-flex raccoon-items-center raccoon-py-0.5">
					<button
            className="raccoon-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(prevURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(prevURIIdx);
              }
            }}
            data-tooltip-id="raccoon-tooltip"
            data-tooltip-content={`${leftKeybindLabel ? `${leftKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveLeft className="raccoon-size-3 raccoon-transition-opacity raccoon-duration-200 raccoon-opacity-70 hover:raccoon-opacity-100" />
					</button>
					<span className="raccoon-text-xs raccoon-whitespace-nowrap raccoon-px-1 raccoon-mx-0.5">
						{currFileIdx !== null ?
            `File ${currFileIdx + 1} of ${sortedCommandBarURIs.length}` :
            `${sortedCommandBarURIs.length} file${sortedCommandBarURIs.length === 1 ? '' : 's'}`
            }
					</span>
					<button
            className="raccoon-cursor-pointer"
            disabled={leftRightDisabled}
            onClick={() => commandBarService.goToURIIdx(nextURIIdx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                commandBarService.goToURIIdx(nextURIIdx);
              }
            }}
            data-tooltip-id="raccoon-tooltip"
            data-tooltip-content={`${rightKeybindLabel ? `${rightKeybindLabel}` : ''}`}
            data-tooltip-delay-show={500}>

						<MoveRight className="raccoon-size-3 raccoon-transition-opacity raccoon-duration-200 raccoon-opacity-70 hover:raccoon-opacity-100" />
					</button>
				</div>


				{/* Accept/Reject buttons - only shown when appropriate */}
				{showAcceptRejectAll &&
        <div className="raccoon-flex raccoon-self-stretch raccoon-gap-0 !raccoon-px-0 !raccoon-py-0">
						<AcceptAllButtonWrapper
          // text={`Accept File${acceptFileKeybindLabel ? ` ${acceptFileKeybindLabel}` : ''}`}
          text={`Accept File`}
          data-tooltip-id='raccoon-tooltip'
          data-tooltip-content={acceptFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onAcceptFile} />

						<RejectAllButtonWrapper
          // text={`Reject File${rejectFileKeybindLabel ? ` ${rejectFileKeybindLabel}` : ''}`}
          text={`Reject File`}
          data-tooltip-id='raccoon-tooltip'
          data-tooltip-content={rejectFileKeybindLabel}
          data-tooltip-delay-show={500}
          onClick={onRejectFile} />

					</div>
        }
				{/* Triple colon menu button */}
				{showAcceptRejectAll && <div className="!raccoon-px-0 !raccoon-py-0 raccoon-self-stretch raccoon-flex raccoon-justify-center raccoon-items-center">
					<div
            className="raccoon-cursor-pointer raccoon-px-1 raccoon-self-stretch raccoon-flex raccoon-justify-center raccoon-items-center"
            onClick={() => setShowAcceptRejectAllButtons(!showAcceptRejectAllButtons)}>

						<EllipsisVertical
              className="raccoon-size-3" />

					</div>
				</div>}
			</div>
		</div>);

};
