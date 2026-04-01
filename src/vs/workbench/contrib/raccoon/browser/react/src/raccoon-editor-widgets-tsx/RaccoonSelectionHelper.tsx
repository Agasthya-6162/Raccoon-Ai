/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/


import { useAccessor, useActiveURI, useIsDark, useSettingsState } from '../util/services.js';

import '../styles.css';
import { raccoon_CTRL_K_ACTION_ID, raccoon_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { Circle, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { raccoonSelectionHelperProps } from '../../../../../../contrib/raccoon/browser/raccoonSelectionHelperWidget.js';
import { raccoon_OPEN_SETTINGS_ACTION_ID } from '../../../raccoonSettingsPane.js';


export const raccoonSelectionHelperMain = (props: raccoonSelectionHelperProps) => {

  const isDark = useIsDark();

  return <div
    className={`raccoon-scope ${isDark ? "raccoon-dark" : ""}`}>

		<RaccoonSelectionHelper {...props} />
	</div>;
};



const RaccoonSelectionHelper = ({ rerenderKey }: raccoonSelectionHelperProps) => {


  const accessor = useAccessor();
  const keybindingService = accessor.get('IKeybindingService');
  const commandService = accessor.get('ICommandService');

  const ctrlLKeybind = keybindingService.lookupKeybinding(raccoon_CTRL_L_ACTION_ID);
  const ctrlKKeybind = keybindingService.lookupKeybinding(raccoon_CTRL_K_ACTION_ID);

  const dividerHTML = <div className="raccoon-w-[0.5px] raccoon-bg-raccoon-border-3"></div>;

  const [reactRerenderCount, setReactRerenderKey] = useState(rerenderKey);
  const [clickState, setClickState] = useState<'init' | 'clickedOption' | 'clickedMore'>('init');

  useEffect(() => {
    const disposable = commandService.onWillExecuteCommand((e) => {
      if (e.commandId === raccoon_CTRL_L_ACTION_ID || e.commandId === raccoon_CTRL_K_ACTION_ID) {
        setClickState('clickedOption');
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [commandService, setClickState]);


  // rerender when the key changes
  if (reactRerenderCount !== rerenderKey) {
    setReactRerenderKey(rerenderKey);
    setClickState('init');
  }
  // useEffect(() => {
  // }, [rerenderKey, reactRerenderCount, setReactRerenderKey, setClickState])

  // if the user selected an option, close


  if (clickState === 'clickedOption') {
    return null;
  }

  const defaultHTML = <>
		{ctrlLKeybind &&
    <div
      className=" raccoon-flex raccoon-items-center raccoon-px-2 raccoon-py-1.5 raccoon-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(raccoon_CTRL_L_ACTION_ID);
        setClickState('clickedOption');
      }}>

				<span>Add to Chat</span>
				<span className="raccoon-ml-1 raccoon-px-1 raccoon-rounded raccoon-bg-[var(--vscode-keybindingLabel-background)] raccoon-text-[var(--vscode-keybindingLabel-foreground)] raccoon-border raccoon-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlLKeybind.getLabel()}
				</span>
			</div>
    }
		{ctrlLKeybind && ctrlKKeybind &&
    dividerHTML
    }
		{ctrlKKeybind &&
    <div
      className=" raccoon-flex raccoon-items-center raccoon-px-2 raccoon-py-1.5 raccoon-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(raccoon_CTRL_K_ACTION_ID);
        setClickState('clickedOption');
      }}>

				<span className="raccoon-ml-1">Edit Inline</span>
				<span className="raccoon-ml-1 raccoon-px-1 raccoon-rounded raccoon-bg-[var(--vscode-keybindingLabel-background)] raccoon-text-[var(--vscode-keybindingLabel-foreground)] raccoon-border raccoon-border-[var(--vscode-keybindingLabel-border)]">
					{ctrlKKeybind.getLabel()}
				</span>
			</div>
    }

		{dividerHTML}

		<div
      className=" raccoon-flex raccoon-items-center raccoon-px-0.5 raccoon-cursor-pointer "



      onClick={() => {
        setClickState('clickedMore');
      }}>

			<MoreVertical className="raccoon-w-4" />
		</div>
	</>;


  const moreOptionsHTML = <>
		<div
      className=" raccoon-flex raccoon-items-center raccoon-px-2 raccoon-py-1.5 raccoon-cursor-pointer "



      onClick={() => {
        commandService.executeCommand(raccoon_OPEN_SETTINGS_ACTION_ID);
        setClickState('clickedOption');
      }}>

			Disable Suggestions?
		</div>

		{dividerHTML}

		<div
      className=" raccoon-flex raccoon-items-center raccoon-px-0.5 raccoon-cursor-pointer "



      onClick={() => {
        setClickState('init');
      }}>

			<MoreVertical className="raccoon-w-4" />
		</div>
	</>;

  return <div className=" raccoon-pointer-events-auto raccoon-select-none raccoon-z-[1000] raccoon-rounded-sm raccoon-shadow-md raccoon-flex raccoon-flex-nowrap raccoon-text-nowrap raccoon-border raccoon-border-raccoon-border-3 raccoon-bg-raccoon-bg-2 raccoon-transition-all raccoon-duration-200 ">






		{clickState === 'init' ? defaultHTML :
    clickState === 'clickedMore' ? moreOptionsHTML :
    <></>
    }
	</div>;
};
