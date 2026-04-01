/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import '../styles.css';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useIsDark } from '../util/services.js';

/**
 * Creates a configured global tooltip component with consistent styling
 * To use:
 * 1. Mount a Tooltip with some id eg id='raccoon-tooltip'
 * 2. Add data-tooltip-id="raccoon-tooltip" and data-tooltip-content="Your tooltip text" to any element
 */
export const RaccoonTooltip = () => {


  const isDark = useIsDark();

  return (

    // use native colors so we don't have to worry about @@raccoon-scope styles
    // --raccoon-bg-1: var(--vscode-input-background);
    // --raccoon-bg-1-alt: var(--vscode-badge-background);
    // --raccoon-bg-2: var(--vscode-sideBar-background);
    // --raccoon-bg-2-alt: color-mix(in srgb, var(--vscode-sideBar-background) 30%, var(--vscode-editor-background) 70%);
    // --raccoon-bg-3: var(--vscode-editor-background);

    // --raccoon-fg-0: color-mix(in srgb, var(--vscode-tab-activeForeground) 90%, black 10%);
    // --raccoon-fg-1: var(--vscode-editor-foreground);
    // --raccoon-fg-2: var(--vscode-input-foreground);
    // --raccoon-fg-3: var(--vscode-input-placeholderForeground);
    // /* --raccoon-fg-4: var(--vscode-tab-inactiveForeground); */
    // --raccoon-fg-4: var(--vscode-list-deemphasizedForeground);

    // --raccoon-warning: var(--vscode-charts-yellow);

    // --raccoon-border-1: var(--vscode-commandCenter-activeBorder);
    // --raccoon-border-2: var(--vscode-commandCenter-border);
    // --raccoon-border-3: var(--vscode-commandCenter-inactiveBorder);
    // --raccoon-border-4: var(--vscode-editorGroup-border);

    <>
			<style>
				{`
				#raccoon-tooltip, #raccoon-tooltip-orange, #raccoon-tooltip-green, #raccoon-tooltip-ollama-settings, #raccoon-tooltip-provider-info {
					font-size: 12px;
					padding: 0px 8px;
					border-radius: 6px;
					z-index: 999999;
					max-width: 300px;
					word-wrap: break-word;
				}

				#raccoon-tooltip {
					background-color: var(--vscode-editor-background);
					color: var(--vscode-input-foreground);
				}

				#raccoon-tooltip-orange {
					background-color: #F6762A;
					color: white;
				}

				#raccoon-tooltip-green {
					background-color: #228B22;
					color: white;
				}

				#raccoon-tooltip-ollama-settings, #raccoon-tooltip-provider-info {
					background-color: var(--vscode-editor-background);
					color: var(--vscode-input-foreground);
				}

				.react-tooltip-arrow {
					z-index: -1 !important; /* Keep arrow behind content (somehow this isnt done automatically) */
				}
				`}
			</style>


			<Tooltip
        id="raccoon-tooltip"
        // border='1px solid var(--vscode-editorGroup-border)'
        border='1px solid rgba(100,100,100,.2)'
        opacity={1}
        delayShow={50} />

			<Tooltip
        id="raccoon-tooltip-orange"
        border='1px solid rgba(200,200,200,.3)'
        opacity={1}
        delayShow={50} />

			<Tooltip
        id="raccoon-tooltip-green"
        border='1px solid rgba(200,200,200,.3)'
        opacity={1}
        delayShow={50} />

			<Tooltip
        id="raccoon-tooltip-ollama-settings"
        border='1px solid rgba(100,100,100,.2)'
        opacity={1}
        openEvents={{ mouseover: true, click: true, focus: true }}
        place='right'
        style={{ pointerEvents: 'all', userSelect: 'text', fontSize: 11 }}>

				<div style={{ padding: '8px 10px' }}>
					<div style={{ opacity: 0.8, textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>
						Good starter models
					</div>
					<div style={{ marginBottom: 4 }}>
						<span style={{ opacity: 0.8 }}>For chat:{` `}</span>
						<span style={{ opacity: 0.8, fontWeight: 'bold' }}>gemma3</span>
					</div>
					<div style={{ marginBottom: 4 }}>
						<span style={{ opacity: 0.8 }}>For autocomplete:{` `}</span>
						<span style={{ opacity: 0.8, fontWeight: 'bold' }}>qwen2.5-coder</span>
					</div>
					<div style={{ marginBottom: 0 }}>
						<span style={{ opacity: 0.8 }}>Use the largest version of these you can!</span>
					</div>
				</div>
			</Tooltip>

			<Tooltip
        id="raccoon-tooltip-provider-info"
        border='1px solid rgba(100,100,100,.2)'
        opacity={1}
        delayShow={50}
        style={{ pointerEvents: 'all', userSelect: 'text', fontSize: 11, maxWidth: '280px', paddingTop: '8px', paddingBottom: '8px' }} />

		</>);

};