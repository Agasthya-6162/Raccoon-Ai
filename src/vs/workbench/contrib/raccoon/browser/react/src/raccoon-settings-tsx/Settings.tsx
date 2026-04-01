/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ProviderName, SettingName, displayInfoOfSettingName, providerNames, raccoonStatefulModelInfo, customSettingNamesOfProvider, RefreshableProviderName, refreshableProviderNames, displayInfoOfProviderName, nonlocalProviderNames, localProviderNames, GlobalSettingName, featureNames, displayInfoOfFeatureName, isProviderNameDisabled, FeatureName, hasDownloadButtonsOnModelsProviderNames, subTextMdOfProviderName } from '../../../../common/raccoonSettingsTypes.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { RaccoonButtonBgDarken, RaccoonCustomDropdownBox, RaccoonInputBox2, RaccoonSimpleInputBox, RaccoonSwitch } from '../util/inputs.js';
import { useAccessor, useIsDark, useIsOptedOut, useRefreshModelListener, useRefreshModelState, useSettingsState } from '../util/services.js';
import { X, RefreshCw, Loader2, Check, Asterisk, Plus } from 'lucide-react';
import { URI } from '../../../../../../../base/common/uri.js';
import { ModelDropdown } from './ModelDropdown.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { WarningBox } from './WarningBox.js';
import { os } from '../../../../common/helpers/systemInfo.js';
import { IconLoading } from '../sidebar-tsx/SidebarChat.js';
import { ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js';
import Severity from '../../../../../../../base/common/severity.js';
import { getModelCapabilities, modelOverrideKeys, ModelOverrides } from '../../../../common/modelCapabilities.js';
import { TransferEditorType, TransferFilesInfo } from '../../../extensionTransferTypes.js';
import { MCPServer } from '../../../../common/mcpServiceTypes.js';
import { useMCPServiceState } from '../util/services.js';
import { OPT_OUT_KEY } from '../../../../common/storageKeys.js';
import { StorageScope, StorageTarget } from '../../../../../../../platform/storage/common/storage.js';

type Tab =
	'models' |
	'localProviders' |
	'providers' |
	'featureOptions' |
	'mcp' |
	'general' |
	'all';


const ButtonLeftTextRightOption = ({ text, leftButton }: { text: string; leftButton?: React.ReactNode; }) => {
	return <div className="raccoon-flex raccoon-items-center raccoon-text-raccoon-fg-3 raccoon-px-3 raccoon-py-0.5 raccoon-rounded-sm raccoon-overflow-hidden raccoon-gap-2">
		{leftButton ? leftButton : null}
		<span>
			{text}
		</span>
	</div>;
};

// models
const RefreshModelButton = ({ providerName }: { providerName: RefreshableProviderName; }) => {

	const refreshModelState = useRefreshModelState();

	const accessor = useAccessor();
	const refreshModelService = accessor.get('IRefreshModelService');
	const metricsService = accessor.get('IMetricsService');

	const [justFinished, setJustFinished] = useState<null | 'finished' | 'error'>(null);

	useRefreshModelListener(
		useCallback((providerName2, refreshModelState) => {
			if (providerName2 !== providerName) return;
			const { state } = refreshModelState[providerName];
			if (!(state === 'finished' || state === 'error')) return;
			setJustFinished(state);
			const tid = setTimeout(() => { setJustFinished(null); }, 2000);
			return () => clearTimeout(tid);
		}, [providerName])
	);

	const { state } = refreshModelState[providerName];

	const { title: providerTitle } = displayInfoOfProviderName(providerName);

	return <ButtonLeftTextRightOption
		leftButton={
			<button
				className="raccoon-flex raccoon-items-center"
				disabled={state === 'refreshing' || justFinished !== null}
				onClick={() => {
					refreshModelService.startRefreshingModels(providerName, { enableProviderOnSuccess: false, doNotFire: false });
					metricsService.capture('Click', { providerName, action: 'Refresh Models' });
				}}>
				{justFinished === 'finished' ? <Check className="raccoon-stroke-green-500 raccoon-size-3" /> :
					justFinished === 'error' ? <X className="raccoon-stroke-red-500 raccoon-size-3" /> :
						state === 'refreshing' ? <Loader2 className="raccoon-size-3 raccoon-animate-spin" /> :
							<RefreshCw className="raccoon-size-3" />}
			</button>
		}
		text={justFinished === 'finished' ? `${providerTitle} Models are up-to-date!` :
			justFinished === 'error' ? `${providerTitle} not found!` :
				`Manually refresh ${providerTitle} models.`} />;
};

const RefreshableModels = () => {
	const settingsState = useSettingsState();

	const buttons = refreshableProviderNames.map((providerName) => {
		if (!settingsState.settingsOfProvider[providerName]._didFillInProviderSettings) return null;
		return <RefreshModelButton key={providerName} providerName={providerName} />;
	});

	return <>
		{buttons}
	</>;
};


export const AnimatedCheckmarkButton = ({ text, className }: { text?: string; className?: string; }) => {
	const [dashOffset, setDashOffset] = useState(40);

	useEffect(() => {
		const startTime = performance.now();
		const duration = 500;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const newOffset = 40 - progress * 40;

			setDashOffset(newOffset);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		const animationId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationId);
	}, []);

	return <div
		className={`raccoon-flex raccoon-items-center raccoon-gap-1.5 raccoon-w-fit ${className ? className : `raccoon-px-2 raccoon-py-0.5 raccoon-text-xs raccoon-text-zinc-900 raccoon-bg-zinc-100 raccoon-rounded-sm`} `}>
		<svg className="raccoon-size-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M5 13l4 4L19 7"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					strokeDasharray: 40,
					strokeDashoffset: dashOffset
				}} />
		</svg>
		{text}
	</div>;
};


const AddButton = ({ disabled, text = 'Add', ...props }: { disabled?: boolean; text?: React.ReactNode; } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return <button
		disabled={disabled}
		className={`raccoon-bg-[#0e70c0] raccoon-px-3 raccoon-py-1 raccoon-text-white raccoon-rounded-sm ${!disabled ? "hover:raccoon-bg-[#1177cb] raccoon-cursor-pointer" : "raccoon-opacity-50 raccoon-cursor-not-allowed raccoon-bg-opacity-70"}`}
		{...props}>
		{text}
	</button>;
};

// ConfirmButton prompts for a second click to confirm an action, cancels if clicking outside
const ConfirmButton = ({ children, onConfirm, className }: { children: React.ReactNode; onConfirm: () => void; className?: string; }) => {
	const [confirm, setConfirm] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!confirm) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setConfirm(false);
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [confirm]);
	return (
		<div ref={ref} className={`raccoon-inline-block`}>
			<RaccoonButtonBgDarken className={className} onClick={() => {
				if (!confirm) {
					setConfirm(true);
				} else {
					onConfirm();
					setConfirm(false);
				}
			}}>
				{confirm ? `Confirm Reset` : children}
			</RaccoonButtonBgDarken>
		</div>);
};

// ---------------- Simplified Model Settings Dialog ------------------

// FIX: all hooks moved unconditionally to the top, before the early return.
const SimpleModelSettingsDialog = ({
	isOpen,
	onClose,
	modelInfo
}: { isOpen: boolean; onClose: () => void; modelInfo: { modelName: string; providerName: ProviderName; type: 'autodetected' | 'custom' | 'default'; } | null; }) => {

	// ALL hooks must be called unconditionally before any early returns.
	const accessor = useAccessor();
	const settingsState = useSettingsState();
	const mouseDownInsideModal = useRef(false);
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

	const settingsStateService = accessor.get('IRaccoonSettingsService');

	// Derive values from modelInfo safely (null-safe)
	const modelName = modelInfo?.modelName ?? '';
	const providerName = modelInfo?.providerName ?? ('' as ProviderName);
	const type = modelInfo?.type ?? 'default';

	const defaultModelCapabilities = modelInfo ? getModelCapabilities(providerName, modelName, undefined) : undefined;
	const currentOverrides = modelInfo ? (settingsState.overridesOfModel?.[providerName]?.[modelName] ?? undefined) : undefined;
	const { recognizedModelName, isUnrecognizedModel } = defaultModelCapabilities ?? { recognizedModelName: '', isUnrecognizedModel: false };
	const providerTitle = (() => {
		try {
			return displayInfoOfProviderName(providerName).title;
		} catch {
			return providerName || 'Unknown provider';
		}
	})();

	const partialDefaults: Partial<ModelOverrides> = {};
	if (defaultModelCapabilities) {
		for (const k of modelOverrideKeys) { if (defaultModelCapabilities[k]) partialDefaults[k] = defaultModelCapabilities[k] as any; }
	}
	const placeholder = JSON.stringify(partialDefaults, null, 2);

	const [overrideEnabled, setOverrideEnabled] = useState<boolean>(() => !!currentOverrides);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		const cur = settingsState.overridesOfModel?.[providerName]?.[modelName];
		setOverrideEnabled(!!cur);
		setErrorMsg(null);
	}, [isOpen, providerName, modelName, settingsState.overridesOfModel, placeholder]);

	// Now it is safe to return early after all hooks have been called.
	if (!isOpen || !modelInfo) return null;

	const onSave = async () => {
		if (!overrideEnabled) {
			await settingsStateService.setOverridesOfModel(providerName, modelName, undefined);
			onClose();
			return;
		}

		let parsedInput: Record<string, unknown>;

		if (textAreaRef.current?.value) {
			try {
				parsedInput = JSON.parse(textAreaRef.current.value);
			} catch (e) {
				setErrorMsg('Invalid JSON');
				return;
			}
		} else {
			setErrorMsg('Invalid JSON');
			return;
		}

		const cleaned: Partial<ModelOverrides> = {};
		for (const k of modelOverrideKeys) {
			if (!(k in parsedInput)) continue;
			const isEmpty = parsedInput[k] === '' || parsedInput[k] === null || parsedInput[k] === undefined;
			if (!isEmpty) {
				cleaned[k] = parsedInput[k] as any;
			}
		}
		await settingsStateService.setOverridesOfModel(providerName, modelName, cleaned);
		onClose();
	};

	const sourcecodeOverridesLink = `https://github.com/DevFlex-AI/Raccoon/blob/2e5ecb291d33afbe4565921664fb7e183189c1c5/src/vs/workbench/contrib/raccoon/common/modelCapabilities.ts#L146-L172`;

	return (
		<div
			className="raccoon-fixed raccoon-inset-0 raccoon-bg-black/50 raccoon-flex raccoon-items-center raccoon-justify-center raccoon-z-[9999999]"
			onMouseDown={() => {
				mouseDownInsideModal.current = false;
			}}
			onMouseUp={() => {
				if (!mouseDownInsideModal.current) {
					onClose();
				}
				mouseDownInsideModal.current = false;
			}}>

			{/* MODAL */}
			<div
				className="raccoon-bg-raccoon-bg-1 raccoon-rounded-md raccoon-p-4 raccoon-max-w-xl raccoon-w-full raccoon-shadow-xl raccoon-overflow-y-auto raccoon-max-h-[90vh]"
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => {
					mouseDownInsideModal.current = true;
					e.stopPropagation();
				}}>

				<div className="raccoon-flex raccoon-justify-between raccoon-items-center raccoon-mb-4">
					<h3 className="raccoon-text-lg raccoon-font-medium">
						Change Defaults for {modelName} ({providerTitle})
					</h3>
					<button
						onClick={onClose}
						className="raccoon-text-raccoon-fg-3 hover:raccoon-text-raccoon-fg-1">
						<X className="raccoon-size-5" />
					</button>
				</div>

				<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mb-4">
					{type === 'default' ? `${modelName} comes packaged with Raccoon, so you shouldn't need to change these settings.` :
						isUnrecognizedModel ?
							`Model not recognized by Raccoon.` :
							`Raccoon recognizes ${modelName} ("${recognizedModelName}").`}
				</div>

				<div className="raccoon-flex raccoon-items-center raccoon-gap-2 raccoon-mb-4">
					<RaccoonSwitch size='xs' value={overrideEnabled} onChange={setOverrideEnabled} />
					<span className="raccoon-text-raccoon-fg-3 raccoon-text-sm">Override model defaults</span>
				</div>

				{overrideEnabled && <div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mb-4">
					<ChatMarkdownRender string={`See the [sourcecode](${sourcecodeOverridesLink}) for a reference on how to set this JSON (advanced).`} chatMessageLocation={undefined} />
				</div>}

				<textarea
					key={overrideEnabled + ''}
					ref={textAreaRef}
					className={`raccoon-w-full raccoon-min-h-[200px] raccoon-p-2 raccoon-rounded-sm raccoon-border raccoon-border-raccoon-border-2 raccoon-bg-raccoon-bg-2 raccoon-resize-none raccoon-font-mono raccoon-text-sm ${!overrideEnabled ? "raccoon-text-raccoon-fg-3" : ""}`}
					defaultValue={overrideEnabled && currentOverrides ? JSON.stringify(currentOverrides, null, 2) : placeholder}
					placeholder={placeholder}
					readOnly={!overrideEnabled} />

				{errorMsg &&
					<div className="raccoon-text-red-500 raccoon-mt-2 raccoon-text-sm">{errorMsg}</div>
				}

				<div className="raccoon-flex raccoon-justify-end raccoon-gap-2 raccoon-mt-4">
					<RaccoonButtonBgDarken onClick={onClose} className="raccoon-px-3 raccoon-py-1">
						Cancel
					</RaccoonButtonBgDarken>
					<RaccoonButtonBgDarken
						onClick={onSave}
						className="raccoon-px-3 raccoon-py-1 raccoon-bg-[#0e70c0] raccoon-text-white">
						Save
					</RaccoonButtonBgDarken>
				</div>
			</div>
		</div>);
};


export const ModelDump = ({ filteredProviders }: { filteredProviders?: ProviderName[]; }) => {
	const accessor = useAccessor();
	const settingsStateService = accessor.get('IRaccoonSettingsService');
	const settingsState = useSettingsState();

	const [openSettingsModel, setOpenSettingsModel] = useState<{
		modelName: string;
		providerName: ProviderName;
		type: 'autodetected' | 'custom' | 'default';
	} | null>(null);

	const [isAddModelOpen, setIsAddModelOpen] = useState(false);
	const [showCheckmark, setShowCheckmark] = useState(false);
	const [userChosenProviderName, setUserChosenProviderName] = useState<ProviderName | null>(null);
	const [modelName, setModelName] = useState<string>('');
	const [errorString, setErrorString] = useState('');

	const modelDump: (raccoonStatefulModelInfo & { providerName: ProviderName; providerEnabled: boolean; })[] = [];

	const providersToShow = filteredProviders || providerNames;

	for (let providerName of providersToShow) {
		const providerSettings = settingsState.settingsOfProvider[providerName];
		modelDump.push(...providerSettings.models.map((model: any) => ({ ...model, providerName, providerEnabled: !!providerSettings._didFillInProviderSettings })));
	}

	modelDump.sort((a, b) => {
		return Number(b.providerEnabled) - Number(a.providerEnabled);
	});

	const handleAddModel = () => {
		if (!userChosenProviderName) {
			setErrorString('Please select a provider.');
			return;
		}
		if (!modelName) {
			setErrorString('Please enter a model name.');
			return;
		}

		if (settingsState.settingsOfProvider[userChosenProviderName].models.find((m: any) => m.modelName === modelName)) {
			setErrorString(`This model already exists.`);
			return;
		}

		settingsStateService.addModel(userChosenProviderName, modelName);
		setShowCheckmark(true);
		setTimeout(() => {
			setShowCheckmark(false);
			setIsAddModelOpen(false);
			setUserChosenProviderName(null);
			setModelName('');
		}, 1500);
		setErrorString('');
	};

	return <div className="">
		{modelDump.map((m, i) => {
			const { isHidden, type, modelName, providerName, providerEnabled } = m;

			const isNewProviderName = (i > 0 ? modelDump[i - 1] : undefined)?.providerName !== providerName;

			const providerTitle = displayInfoOfProviderName(providerName).title;

			const disabled = !providerEnabled;
			const value = disabled ? false : !isHidden;

			const tooltipName =
				disabled ? `Add ${providerTitle} to enable` :
					value === true ? 'Show in Dropdown' :
						'Hide from Dropdown';

			const detailAboutModel = type === 'autodetected' ?
				<Asterisk size={14} className="raccoon-inline-block raccoon-align-text-top raccoon-brightness-115 raccoon-stroke-[2] raccoon-text-[#0e70c0]" data-tooltip-id='raccoon-tooltip' data-tooltip-place='right' data-tooltip-content='Detected locally' /> :
				type === 'custom' ?
					<Asterisk size={14} className="raccoon-inline-block raccoon-align-text-top raccoon-brightness-115 raccoon-stroke-[2] raccoon-text-[#0e70c0]" data-tooltip-id='raccoon-tooltip' data-tooltip-place='right' data-tooltip-content='Custom model' /> :
					undefined;

			const hasOverrides = !!settingsState.overridesOfModel?.[providerName]?.[modelName];

			return <div key={`${modelName}${providerName}`}
				className={`raccoon-flex raccoon-items-center raccoon-justify-between raccoon-gap-4 hover:raccoon-bg-black/10 dark:hover:raccoon-bg-gray-300/10 raccoon-py-1 raccoon-px-3 raccoon-rounded-sm raccoon-overflow-hidden raccoon-cursor-default raccoon-truncate raccoon-group `}>

				<div className={`raccoon-flex raccoon-flex-grow raccoon-items-center raccoon-gap-4`}>
					<span className="raccoon-w-full raccoon-max-w-32">{isNewProviderName ? providerTitle : ''}</span>
					<span className="raccoon-w-fit raccoon-max-w-[400px] raccoon-truncate">{modelName}</span>
				</div>

				<div className="raccoon-flex raccoon-items-center raccoon-gap-2 raccoon-w-fit">
					{disabled ? null :
						<div className="raccoon-w-5 raccoon-flex raccoon-items-center raccoon-justify-center">
							<button
								onClick={() => { setOpenSettingsModel({ modelName, providerName, type }); }}
								data-tooltip-id='raccoon-tooltip'
								data-tooltip-place='right'
								data-tooltip-content='Advanced Settings'
								className={`${hasOverrides ? "" : "raccoon-opacity-0 group-hover:raccoon-opacity-100"} raccoon-transition-opacity`}>
								<Plus size={12} className="raccoon-text-raccoon-fg-3 raccoon-opacity-50" />
							</button>
						</div>
					}

					{detailAboutModel}

					<RaccoonSwitch
						value={value}
						onChange={() => { settingsStateService.toggleModelHidden(providerName, modelName); }}
						disabled={disabled}
						size='sm'
						data-tooltip-id='raccoon-tooltip'
						data-tooltip-place='right'
						data-tooltip-content={tooltipName} />

					<div className={`raccoon-w-5 raccoon-flex raccoon-items-center raccoon-justify-center`}>
						{type === 'default' || type === 'autodetected' ? null : <button
							onClick={() => { settingsStateService.deleteModel(providerName, modelName); }}
							data-tooltip-id='raccoon-tooltip'
							data-tooltip-place='right'
							data-tooltip-content='Delete'
							className={`${hasOverrides ? "" : "raccoon-opacity-0 group-hover:raccoon-opacity-100"} raccoon-transition-opacity`}>
							<X size={12} className="raccoon-text-raccoon-fg-3 raccoon-opacity-50" />
						</button>}
					</div>
				</div>
			</div>;
		})}

		{/* Add Model Section */}
		{showCheckmark ?
			<div className="raccoon-mt-4">
				<AnimatedCheckmarkButton text='Added' className="raccoon-bg-[#0e70c0] raccoon-text-white raccoon-px-3 raccoon-py-1 raccoon-rounded-sm" />
			</div> :
			isAddModelOpen ?
				// FIX: replaced <form> with <div> to prevent accidental page reload on Enter keypress
				<div className="raccoon-mt-4">
					<div className="raccoon-flex raccoon-items-center raccoon-gap-2">

						<ErrorBoundary>
							<RaccoonCustomDropdownBox
								options={providersToShow}
								selectedOption={userChosenProviderName}
								onChangeOption={(pn) => setUserChosenProviderName(pn)}
								getOptionDisplayName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
								getOptionDropdownName={(pn) => pn ? displayInfoOfProviderName(pn).title : 'Provider Name'}
								getOptionsEqual={(a, b) => a === b}
								className="raccoon-max-w-32 raccoon-mx-2 raccoon-w-full raccoon-resize-none raccoon-bg-raccoon-bg-1 raccoon-text-raccoon-fg-1 placeholder:raccoon-text-raccoon-fg-3 raccoon-border raccoon-border-raccoon-border-2 focus:raccoon-border-raccoon-border-1 raccoon-py-1 raccoon-px-2 raccoon-rounded"
								arrowTouchesText={false} />
						</ErrorBoundary>

						<ErrorBoundary>
							<RaccoonSimpleInputBox
								value={modelName}
								compact={true}
								onChangeValue={setModelName}
								placeholder='Model Name'
								className="raccoon-max-w-32" />
						</ErrorBoundary>

						<ErrorBoundary>
							<AddButton
								type='button'
								disabled={!modelName || !userChosenProviderName}
								onClick={handleAddModel} />
						</ErrorBoundary>

						<button
							type="button"
							onClick={() => {
								setIsAddModelOpen(false);
								setErrorString('');
								setModelName('');
								setUserChosenProviderName(null);
							}}
							className="raccoon-text-raccoon-fg-4">
							<X className="raccoon-size-4" />
						</button>
					</div>

					{errorString &&
						<div className="raccoon-text-red-500 raccoon-truncate raccoon-whitespace-nowrap raccoon-mt-1">
							{errorString}
						</div>
					}
				</div> :

				<div
					className="raccoon-text-raccoon-fg-4 raccoon-flex raccoon-flex-nowrap raccoon-text-nowrap raccoon-items-center hover:raccoon-brightness-110 raccoon-cursor-pointer raccoon-mt-4"
					onClick={() => setIsAddModelOpen(true)}>
					<div className="raccoon-flex raccoon-items-center raccoon-gap-1">
						<Plus size={16} />
						<span>Add a model</span>
					</div>
				</div>
		}

		{/* Model Settings Dialog */}
		<SimpleModelSettingsDialog
			isOpen={openSettingsModel !== null}
			onClose={() => setOpenSettingsModel(null)}
			modelInfo={openSettingsModel} />

	</div>;
};


// providers

const ProviderSetting = ({ providerName, settingName, subTextMd }: { providerName: ProviderName; settingName: SettingName; subTextMd: React.ReactNode; }) => {

	const { title: settingTitle, placeholder, isPasswordField } = displayInfoOfSettingName(providerName, settingName);

	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const settingsState = useSettingsState();

	const settingValue = settingsState.settingsOfProvider[providerName][settingName] as string;
	if (typeof settingValue !== 'string') {
		console.log('Error: Provider setting had a non-string value.');
		// FIX: return null instead of bare return (undefined), which crashes React
		return null;
	}

	const handleChangeValue = useCallback((newVal: string) => {
		raccoonSettingsService.setSettingOfProvider(providerName, settingName, newVal);
	}, [raccoonSettingsService, providerName, settingName]);

	return <ErrorBoundary>
		<div className="raccoon-my-1">
			<RaccoonSimpleInputBox
				value={settingValue}
				onChangeValue={handleChangeValue}
				placeholder={`${settingTitle} (${placeholder})`}
				passwordBlur={isPasswordField}
				compact={true} />

			{!subTextMd ? null : <div className="raccoon-py-1 raccoon-px-3 raccoon-opacity-50 raccoon-text-sm">
				{subTextMd}
			</div>}
		</div>
	</ErrorBoundary>;
};


export const SettingsForProvider = ({ providerName, showProviderTitle, showProviderSuggestions }: { providerName: ProviderName; showProviderTitle: boolean; showProviderSuggestions: boolean; }) => {
	const raccoonSettingsState = useSettingsState();

	const needsModel = isProviderNameDisabled(providerName, raccoonSettingsState) === 'addModel';

	const settingNames = customSettingNamesOfProvider(providerName);

	const { title: providerTitle } = displayInfoOfProviderName(providerName);

	return <div>
		<div className="raccoon-flex raccoon-items-center raccoon-w-full raccoon-gap-4">
			{showProviderTitle && <h3 className="raccoon-text-xl raccoon-truncate">{providerTitle}</h3>}
		</div>

		<div className="raccoon-px-0">
			{settingNames.map((settingName, i) => {
				return <ProviderSetting
					key={settingName}
					providerName={providerName}
					settingName={settingName}
					subTextMd={i !== settingNames.length - 1 ? null :
						<ChatMarkdownRender string={subTextMdOfProviderName(providerName)} chatMessageLocation={undefined} />} />;
			})}

			{showProviderSuggestions && needsModel ?
				providerName === 'ollama' ?
					<WarningBox className="raccoon-pl-2 raccoon-mb-4" text={`Please install an Ollama model. We'll auto-detect it.`} /> :
					<WarningBox className="raccoon-pl-2 raccoon-mb-4" text={`Please add a model for ${providerTitle} (Models section).`} /> :
				null}
		</div>
	</div>;
};


export const RaccoonProviderSettings = ({ providerNames }: { providerNames: ProviderName[]; }) => {
	return <>
		{providerNames.map((providerName) =>
			<SettingsForProvider key={providerName} providerName={providerName} showProviderTitle={true} showProviderSuggestions={true} />
		)}
	</>;
};


export const AutoDetectLocalModelsToggle = () => {
	const settingName: GlobalSettingName = 'autoRefreshModels';

	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const metricsService = accessor.get('IMetricsService');

	const raccoonSettingsState = useSettingsState();

	const enabled = raccoonSettingsState.globalSettings[settingName];

	return <ButtonLeftTextRightOption
		leftButton={<RaccoonSwitch
			size='xxs'
			value={enabled}
			onChange={(newVal) => {
				raccoonSettingsService.setGlobalSetting(settingName, newVal);
				metricsService.capture('Click', { action: 'Autorefresh Toggle', settingName, enabled: newVal });
			}} />
		}
		text={`Automatically detect local providers and models (${refreshableProviderNames.map((providerName) => displayInfoOfProviderName(providerName).title).join(', ')}).`} />;
};

export const AIInstructionsBox = () => {
	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const raccoonSettingsState = useSettingsState();
	return <RaccoonInputBox2
		className="raccoon-min-h-[81px] raccoon-p-3 raccoon-rounded-sm"
		initValue={raccoonSettingsState.globalSettings.aiInstructions}
		placeholder={`Do not change my indentation or delete my comments. When writing TS or JS, do not add ;'s. Write new code using Rust if possible. `}
		multiline
		onChangeText={(newText) => {
			raccoonSettingsService.setGlobalSetting('aiInstructions', newText);
		}} />;
};

const FastApplyMethodDropdown = () => {
	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');

	const options = useMemo(() => [true, false], []);

	const onChangeOption = useCallback((newVal: boolean) => {
		raccoonSettingsService.setGlobalSetting('enableFastApply', newVal);
	}, [raccoonSettingsService]);

	return <RaccoonCustomDropdownBox
		className="raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-bg-raccoon-bg-1 raccoon-border raccoon-border-raccoon-border-1 raccoon-rounded raccoon-p-0.5 raccoon-px-1"
		options={options}
		selectedOption={raccoonSettingsService.state.globalSettings.enableFastApply}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
		getOptionDropdownName={(val) => val ? 'Fast Apply' : 'Slow Apply'}
		getOptionDropdownDetail={(val) => val ? 'Output Search/Replace blocks' : 'Rewrite whole files'}
		getOptionsEqual={(a, b) => a === b} />;
};


export const OllamaSetupInstructions = ({ sayWeAutoDetect }: { sayWeAutoDetect?: boolean; }) => {
	return <div className="prose-p:raccoon-my-0 prose-ol:raccoon-list-decimal prose-p:raccoon-py-0 prose-ol:raccoon-my-0 prose-ol:raccoon-py-0 prose-span:raccoon-my-0 prose-span:raccoon-py-0 raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-list-decimal raccoon-select-text">
		<div className=""><ChatMarkdownRender string={`Ollama Setup Instructions`} chatMessageLocation={undefined} /></div>
		<div className=" raccoon-pl-6"><ChatMarkdownRender string={`1. Download [Ollama](https://ollama.com/download).`} chatMessageLocation={undefined} /></div>
		<div className=" raccoon-pl-6"><ChatMarkdownRender string={`2. Open your terminal.`} chatMessageLocation={undefined} /></div>
		<div
			className="raccoon-pl-6 raccoon-flex raccoon-items-center raccoon-w-fit"
			data-tooltip-id='raccoon-tooltip-ollama-settings'>
			<ChatMarkdownRender string={`3. Run \`ollama pull your_model\` to install a model.`} chatMessageLocation={undefined} />
		</div>
		{sayWeAutoDetect && <div className=" raccoon-pl-6"><ChatMarkdownRender string={`Raccoon AI automatically detects locally running models and enables them.`} chatMessageLocation={undefined} /></div>}
	</div>;
};


const RedoOnboardingButton = ({ className }: { className?: string; }) => {
	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	return <div
		className={`raccoon-text-raccoon-fg-4 raccoon-flex raccoon-flex-nowrap raccoon-text-nowrap raccoon-items-center hover:raccoon-brightness-110 raccoon-cursor-pointer ${className}`}
		onClick={() => { raccoonSettingsService.setGlobalSetting('isOnboardingComplete', false); }}>
		See onboarding screen?
	</div>;
};


export const ToolApprovalTypeSwitch = ({ approvalType, size, desc }: { approvalType: ToolApprovalType; size: "xxs" | "xs" | "sm" | "sm+" | "md"; desc: string; }) => {
	const accessor = useAccessor();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const raccoonSettingsState = useSettingsState();
	const metricsService = accessor.get('IMetricsService');

	const onToggleAutoApprove = useCallback((approvalType: ToolApprovalType, newValue: boolean) => {
		raccoonSettingsService.setGlobalSetting('autoApprove', {
			...raccoonSettingsService.state.globalSettings.autoApprove,
			[approvalType]: newValue
		});
		metricsService.capture('Tool Auto-Accept Toggle', { enabled: newValue });
	}, [raccoonSettingsService, metricsService]);

	return <>
		<RaccoonSwitch
			size={size}
			value={raccoonSettingsState.globalSettings.autoApprove[approvalType] ?? false}
			onChange={(newVal) => onToggleAutoApprove(approvalType, newVal)} />
		<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs">{desc}</span>
	</>;
};


export const OneClickSwitchButton = ({ fromEditor = 'VS Code', className = '' }: { fromEditor?: TransferEditorType; className?: string; }) => {
	const accessor = useAccessor();
	const extensionTransferService = accessor.get('IExtensionTransferService');

	const [transferState, setTransferState] = useState<{ type: 'done'; error?: string; } | { type: 'loading' | 'justfinished'; }>({ type: 'done' });

	const onClick = async () => {
		if (transferState.type !== 'done') return;

		setTransferState({ type: 'loading' });

		const errAcc = await extensionTransferService.transferExtensions(os, fromEditor);

		const hadError = !!errAcc;
		if (hadError) {
			setTransferState({ type: 'done', error: errAcc });
		} else {
			setTransferState({ type: 'justfinished' });
			setTimeout(() => { setTransferState({ type: 'done' }); }, 3000);
		}
	};

	return <>
		<RaccoonButtonBgDarken className={`raccoon-max-w-48 raccoon-p-4 ${className}`} disabled={transferState.type !== 'done'} onClick={onClick}>
			{transferState.type === 'done' ? `Transfer from ${fromEditor}` :
				transferState.type === 'loading' ? <span className="raccoon-text-nowrap raccoon-flex raccoon-flex-nowrap">Transferring<IconLoading /></span> :
					transferState.type === 'justfinished' ? <AnimatedCheckmarkButton text='Settings Transferred' className="raccoon-bg-none" /> :
						null
			}
		</RaccoonButtonBgDarken>
		{transferState.type === 'done' && transferState.error ? <WarningBox text={transferState.error} /> : null}
	</>;
};


// full settings

const MCPServerComponent = ({ name, server }: { name: string; server: MCPServer; }) => {
	const accessor = useAccessor();
	const mcpService = accessor.get('IMCPService');

	const raccoonSettings = useSettingsState();
	const isOn = raccoonSettings.mcpUserStateOfName[name]?.isOn;

	const removeUniquePrefix = (name: string) => name.split('_').slice(1).join('_');

	return (
		<div className="raccoon-border raccoon-border-raccoon-border-2 raccoon-bg-raccoon-bg-1 raccoon-py-3 raccoon-px-4 raccoon-rounded-sm raccoon-my-2">
			<div className="raccoon-flex raccoon-items-center raccoon-justify-between">
				<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
					<div className={`raccoon-w-2 raccoon-h-2 raccoon-rounded-full ${server.status === 'success' ? "raccoon-bg-green-500" :
						server.status === 'error' ? "raccoon-bg-red-500" :
							server.status === 'loading' ? "raccoon-bg-yellow-500" :
								server.status === 'offline' ? "raccoon-bg-raccoon-fg-3" : ""} `}>
					</div>
					<div className="raccoon-text-sm raccoon-font-medium raccoon-text-raccoon-fg-1">{name}</div>
				</div>

				<RaccoonSwitch
					value={isOn ?? false}
					size='xs'
					disabled={server.status === 'error'}
					onChange={() => mcpService.toggleServerIsOn(name, !isOn)} />
			</div>

			{isOn &&
				<div className="raccoon-mt-3">
					<div className="raccoon-flex raccoon-flex-wrap raccoon-gap-2 raccoon-max-h-32 raccoon-overflow-y-auto">
						{(server.tools ?? []).length > 0 ?
							(server.tools ?? []).map((tool: { name: string; description?: string; }) =>
								<span
									key={tool.name}
									className="raccoon-px-2 raccoon-py-0.5 raccoon-bg-raccoon-bg-2 raccoon-text-raccoon-fg-3 raccoon-rounded-sm raccoon-text-xs"
									data-tooltip-id='raccoon-tooltip'
									data-tooltip-content={tool.description || ''}
									data-tooltip-class-name='raccoon-max-w-[300px]'>
									{removeUniquePrefix(tool.name)}
								</span>
							) :
							<span className="raccoon-text-xs raccoon-text-raccoon-fg-3">No tools available</span>
						}
					</div>
				</div>
			}

			{isOn && server.command &&
				<div className="raccoon-mt-3">
					<div className="raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-mb-1">Command:</div>
					<div className="raccoon-px-2 raccoon-py-1 raccoon-bg-raccoon-bg-2 raccoon-text-xs raccoon-font-mono raccoon-overflow-x-auto raccoon-whitespace-nowrap raccoon-text-raccoon-fg-2 raccoon-rounded-sm">
						{server.command}
					</div>
				</div>
			}

			{server.error &&
				<div className="raccoon-mt-3">
					<WarningBox text={server.error} />
				</div>
			}
		</div>);
};

const MCPServersList = () => {
	const mcpServiceState = useMCPServiceState();

	let content: React.ReactNode;
	if (mcpServiceState.error) {
		content = <div className="raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-mt-2">
			{mcpServiceState.error}
		</div>;
	} else {
		const entries = Object.entries(mcpServiceState.mcpServerOfName);
		if (entries.length === 0) {
			content = <div className="raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-mt-2">
				No servers found
			</div>;
		} else {
			content = entries.map(([name, server]) =>
				<MCPServerComponent key={name} name={name} server={server} />
			);
		}
	}

	return <div className="raccoon-my-2">{content}</div>;
};

export const Settings = () => {
	const isDark = useIsDark();
	const [selectedSection, setSelectedSection] = useState<Tab>('models');

	const navItems: { tab: Tab; label: string; }[] = [
		{ tab: 'models', label: 'Models' },
		{ tab: 'localProviders', label: 'Local Providers' },
		{ tab: 'providers', label: 'Main Providers' },
		{ tab: 'featureOptions', label: 'Feature Options' },
		{ tab: 'general', label: 'General' },
		{ tab: 'mcp', label: 'MCP' },
		{ tab: 'all', label: 'All Settings' }];

	const shouldShowTab = (tab: Tab) => selectedSection === 'all' || selectedSection === tab;
	const accessor = useAccessor();
	const commandService = accessor.get('ICommandService');
	const environmentService = accessor.get('IEnvironmentService');
	const nativeHostService = accessor.get('INativeHostService');
	const settingsState = useSettingsState();
	const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
	const chatThreadsService = accessor.get('IChatThreadService');
	const notificationService = accessor.get('INotificationService');
	const mcpService = accessor.get('IMCPService');
	const storageService = accessor.get('IStorageService');
	const metricsService = accessor.get('IMetricsService');
	const isOptedOut = useIsOptedOut();

	const onDownload = (t: 'Chats' | 'Settings') => {
		let dataStr: string;
		let downloadName: string;
		if (t === 'Chats') {
			dataStr = JSON.stringify(chatThreadsService.state, null, 2);
			downloadName = 'raccoon-chats.json';
		} else if (t === 'Settings') {
			dataStr = JSON.stringify(raccoonSettingsService.state, null, 2);
			downloadName = 'raccoon-settings.json';
		} else {
			dataStr = '';
			downloadName = '';
		}

		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = downloadName;
		a.click();
		URL.revokeObjectURL(url);
	};

	const fileInputSettingsRef = useRef<HTMLInputElement>(null);
	const fileInputChatsRef = useRef<HTMLInputElement>(null);

	const [s, ss] = useState(0);

	const handleUpload = (t: 'Chats' | 'Settings') => (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		const file = files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			try {
				const json = JSON.parse(reader.result as string);

				if (t === 'Chats') {
					chatThreadsService.dangerousSetState(json as any);
				} else if (t === 'Settings') {
					raccoonSettingsService.dangerousSetState(json as any);
				}

				notificationService.info(`${t} imported successfully!`);
			} catch (err) {
				notificationService.notify({ message: `Failed to import ${t}`, source: err + '', severity: Severity.Error });
			}
		};
		reader.readAsText(file);
		e.target.value = '';

		ss((s) => s + 1);
	};


	return (
		<div className={`raccoon-scope ${isDark ? "raccoon-dark" : ""}`} style={{ height: '100%', width: '100%', overflow: 'auto' }}>
			<div className="raccoon-flex raccoon-flex-col md:raccoon-flex-row raccoon-w-full raccoon-gap-6 raccoon-max-w-[900px] raccoon-mx-auto raccoon-mb-32" style={{ minHeight: '80vh' }}>

				<aside className="md:raccoon-w-1/4 raccoon-w-full raccoon-p-6 raccoon-shrink-0">
					<div className="raccoon-flex raccoon-flex-col raccoon-gap-2 raccoon-mt-12">
						{navItems.map(({ tab, label }) =>
							<button
								key={tab}
								onClick={() => {
									if (tab === 'all') {
										setSelectedSection('all');
										window.scrollTo({ top: 0, behavior: 'smooth' });
									} else {
										setSelectedSection(tab);
									}
								}}
								className={` raccoon-py-2 raccoon-px-4 raccoon-rounded-md raccoon-text-left raccoon-transition-all raccoon-duration-200 ${selectedSection === tab ? "raccoon-bg-[#0e70c0]/80 raccoon-text-white raccoon-font-medium raccoon-shadow-sm" : "raccoon-bg-raccoon-bg-2 hover:raccoon-bg-raccoon-bg-2/80 raccoon-text-raccoon-fg-1"} `}>
								{label}
							</button>
						)}
					</div>
				</aside>

				<main className="raccoon-flex-1 raccoon-p-6 raccoon-select-none">
					<div className="raccoon-max-w-3xl">

						<h1 className="raccoon-text-2xl raccoon-w-full">{`Raccoon's Settings`}</h1>

						<div className="raccoon-w-full raccoon-h-[1px] raccoon-my-2" />

						<ErrorBoundary>
							<RedoOnboardingButton />
						</ErrorBoundary>

						<div className="raccoon-w-full raccoon-h-[1px] raccoon-my-4" />

						<div className="raccoon-flex raccoon-flex-col raccoon-gap-12">

							{/* Models section */}
							<div className={shouldShowTab('models') ? `` : "raccoon-hidden"}>
								<ErrorBoundary>
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Models</h2>
									<ModelDump />
									<div className="raccoon-w-full raccoon-h-[1px] raccoon-my-4" />
									<AutoDetectLocalModelsToggle />
									<RefreshableModels />
								</ErrorBoundary>
							</div>

							{/* Local Providers section */}
							<div className={shouldShowTab('localProviders') ? `` : "raccoon-hidden"}>
								<ErrorBoundary>
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Local Providers</h2>
									<h3 className={`raccoon-text-raccoon-fg-3 raccoon-mb-2`}>{`Raccoon AI can access any model that you host locally. We automatically detect your local models by default.`}</h3>

									<div className="raccoon-opacity-80 raccoon-mb-4">
										<OllamaSetupInstructions sayWeAutoDetect={true} />
									</div>

									<RaccoonProviderSettings providerNames={localProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Main Providers section */}
							<div className={shouldShowTab('providers') ? `` : "raccoon-hidden"}>
								<ErrorBoundary>
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Main Providers</h2>
									<h3 className={`raccoon-text-raccoon-fg-3 raccoon-mb-2`}>{`Raccoon AI can access models from Anthropic, OpenAI, OpenRouter, and more.`}</h3>

									<RaccoonProviderSettings providerNames={nonlocalProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Feature Options section */}
							<div className={shouldShowTab('featureOptions') ? `` : "raccoon-hidden"}>
								<ErrorBoundary>
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Feature Options</h2>

									<div className="raccoon-flex raccoon-flex-col raccoon-gap-y-8 raccoon-my-4">
										<ErrorBoundary>
											<div>
												<h4 className={`raccoon-text-base`}>{displayInfoOfFeatureName('Autocomplete')}</h4>
												<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mt-1">
													<span>
														Experimental.{' '}
													</span>
													<span
														className="hover:raccoon-brightness-110"
														data-tooltip-id='raccoon-tooltip'
														data-tooltip-content='We recommend using the largest qwen2.5-coder model you can with Ollama (try qwen2.5-coder:3b).'
														data-tooltip-class-name='raccoon-max-w-[20px]'>
														Only works with FIM models.*
													</span>
												</div>

												<div className="raccoon-my-2">
													<ErrorBoundary>
														<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
															<RaccoonSwitch
																size='xs'
																value={settingsState.globalSettings.enableAutocomplete}
																onChange={(newVal) => raccoonSettingsService.setGlobalSetting('enableAutocomplete', newVal)} />
															<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{settingsState.globalSettings.enableAutocomplete ? 'Enabled' : 'Disabled'}</span>
														</div>
													</ErrorBoundary>

													<ErrorBoundary>
														<div className={`raccoon-my-2 ${!settingsState.globalSettings.enableAutocomplete ? "raccoon-hidden" : ""}`}>
															<ModelDropdown featureName={'Autocomplete'} className="raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-bg-raccoon-bg-1 raccoon-border raccoon-border-raccoon-border-1 raccoon-rounded raccoon-p-0.5 raccoon-px-1" />
														</div>
													</ErrorBoundary>
												</div>
											</div>
										</ErrorBoundary>

										<ErrorBoundary>
											<div className="raccoon-w-full">
												<h4 className={`raccoon-text-base`}>{displayInfoOfFeatureName('Apply')}</h4>
												<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mt-1">Settings that control the behavior of the Apply button.</div>

												<div className="raccoon-my-2">
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<RaccoonSwitch
															size='xs'
															value={settingsState.globalSettings.syncApplyToChat}
															onChange={(newVal) => raccoonSettingsService.setGlobalSetting('syncApplyToChat', newVal)} />
														<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{settingsState.globalSettings.syncApplyToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													<div className={`raccoon-my-2 ${settingsState.globalSettings.syncApplyToChat ? "raccoon-hidden" : ""}`}>
														<ModelDropdown featureName={'Apply'} className="raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-bg-raccoon-bg-1 raccoon-border raccoon-border-raccoon-border-1 raccoon-rounded raccoon-p-0.5 raccoon-px-1" />
													</div>
												</div>

												<div className="raccoon-my-2">
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<FastApplyMethodDropdown />
													</div>
												</div>
											</div>
										</ErrorBoundary>

										<div>
											<h4 className={`raccoon-text-base`}>Tools</h4>
											<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mt-1">{`Tools are functions that LLMs can call. Some tools require user approval.`}</div>

											<div className="raccoon-my-2">
												<ErrorBoundary>
													{[...toolApprovalTypes].map((approvalType) => {
														return <div key={approvalType} className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
															<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
														</div>;
													})}
												</ErrorBoundary>

												<ErrorBoundary>
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<RaccoonSwitch
															size='xs'
															value={settingsState.globalSettings.includeToolLintErrors}
															onChange={(newVal) => raccoonSettingsService.setGlobalSetting('includeToolLintErrors', newVal)} />
														<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{settingsState.globalSettings.includeToolLintErrors ? 'Fix lint errors' : `Fix lint errors`}</span>
													</div>
												</ErrorBoundary>

												<ErrorBoundary>
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<RaccoonSwitch
															size='xs'
															value={settingsState.globalSettings.autoAcceptLLMChanges}
															onChange={(newVal) => raccoonSettingsService.setGlobalSetting('autoAcceptLLMChanges', newVal)} />
														<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">Auto-accept LLM changes</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										<div className="raccoon-w-full">
											<h4 className={`raccoon-text-base`}>Editor</h4>
											<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mt-1">{`Settings that control the visibility of Raccoon suggestions in the code editor.`}</div>

											<div className="raccoon-my-2">
												<ErrorBoundary>
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<RaccoonSwitch
															size='xs'
															value={settingsState.globalSettings.showInlineSuggestions}
															onChange={(newVal) => raccoonSettingsService.setGlobalSetting('showInlineSuggestions', newVal)} />
														<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{settingsState.globalSettings.showInlineSuggestions ? 'Show suggestions on select' : 'Show suggestions on select'}</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										<ErrorBoundary>
											<div className="raccoon-w-full">
												<h4 className={`raccoon-text-base`}>{displayInfoOfFeatureName('SCM')}</h4>
												<div className="raccoon-text-sm raccoon-text-raccoon-fg-3 raccoon-mt-1">Settings that control the behavior of the commit message generator.</div>

												<div className="raccoon-my-2">
													<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
														<RaccoonSwitch
															size='xs'
															value={settingsState.globalSettings.syncSCMToChat}
															onChange={(newVal) => raccoonSettingsService.setGlobalSetting('syncSCMToChat', newVal)} />
														<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{settingsState.globalSettings.syncSCMToChat ? 'Same as Chat model' : 'Different model'}</span>
													</div>

													<div className={`raccoon-my-2 ${settingsState.globalSettings.syncSCMToChat ? "raccoon-hidden" : ""}`}>
														<ModelDropdown featureName={'SCM'} className="raccoon-text-xs raccoon-text-raccoon-fg-3 raccoon-bg-raccoon-bg-1 raccoon-border raccoon-border-raccoon-border-1 raccoon-rounded raccoon-p-0.5 raccoon-px-1" />
													</div>
												</div>
											</div>
										</ErrorBoundary>
									</div>
								</ErrorBoundary>
							</div>

							{/* General section */}
							<div className={`${shouldShowTab('general') ? `` : "raccoon-hidden"} raccoon-flex raccoon-flex-col raccoon-gap-12`}>
								<div>
									<ErrorBoundary>
										<h2 className="raccoon-text-3xl raccoon-mb-2">One-Click Switch</h2>
										<h4 className="raccoon-text-raccoon-fg-3 raccoon-mb-4">{`Transfer your editor settings into Raccoon.`}</h4>

										<div className="raccoon-flex raccoon-flex-col raccoon-gap-2">
											<OneClickSwitchButton className="raccoon-w-48" fromEditor="VS Code" />
											<OneClickSwitchButton className="raccoon-w-48" fromEditor="Cursor" />
											<OneClickSwitchButton className="raccoon-w-48" fromEditor="Windsurf" />
										</div>
									</ErrorBoundary>
								</div>

								<div>
									<h2 className="raccoon-text-3xl raccoon-mb-2">Import/Export</h2>
									<h4 className="raccoon-text-raccoon-fg-3 raccoon-mb-4">{`Transfer Raccoon's settings and chats in and out of Raccoon.`}</h4>
									<div className="raccoon-flex raccoon-flex-col raccoon-gap-8">
										<div className="raccoon-flex raccoon-flex-col raccoon-gap-2 raccoon-max-w-48 raccoon-w-full">
											<input key={2 * s} ref={fileInputSettingsRef} type='file' accept='.json' className="raccoon-hidden" onChange={handleUpload('Settings')} />
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onClick={() => { fileInputSettingsRef.current?.click(); }}>
												Import Settings
											</RaccoonButtonBgDarken>
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onClick={() => onDownload('Settings')}>
												Export Settings
											</RaccoonButtonBgDarken>
											<ConfirmButton className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onConfirm={() => { raccoonSettingsService.resetState(); }}>
												Reset Settings
											</ConfirmButton>
										</div>

										<div className="raccoon-flex raccoon-flex-col raccoon-gap-2 raccoon-max-w-48 raccoon-w-full">
											<input key={2 * s + 1} ref={fileInputChatsRef} type='file' accept='.json' className="raccoon-hidden" onChange={handleUpload('Chats')} />
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onClick={() => { fileInputChatsRef.current?.click(); }}>
												Import Chats
											</RaccoonButtonBgDarken>
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onClick={() => onDownload('Chats')}>
												Export Chats
											</RaccoonButtonBgDarken>
											<ConfirmButton className="raccoon-px-4 raccoon-py-1 raccoon-w-full" onConfirm={() => { chatThreadsService.resetState(); }}>
												Reset Chats
											</ConfirmButton>
										</div>
									</div>
								</div>

								<div>
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Built-in Settings</h2>
									<h4 className={`raccoon-text-raccoon-fg-3 raccoon-mb-4`}>{`IDE settings, keyboard settings, and theme customization.`}</h4>

									<ErrorBoundary>
										<div className="raccoon-flex raccoon-flex-col raccoon-gap-2 raccoon-justify-center raccoon-max-w-48 raccoon-w-full">
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1" onClick={() => { commandService.executeCommand('workbench.action.openSettings'); }}>
												General Settings
											</RaccoonButtonBgDarken>
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1" onClick={() => { commandService.executeCommand('workbench.action.openGlobalKeybindings'); }}>
												Keyboard Settings
											</RaccoonButtonBgDarken>
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1" onClick={() => { commandService.executeCommand('workbench.action.selectTheme'); }}>
												Theme Settings
											</RaccoonButtonBgDarken>
											<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1" onClick={() => { nativeHostService.showItemInFolder(environmentService.logsHome.fsPath); }}>
												Open Logs
											</RaccoonButtonBgDarken>
										</div>
									</ErrorBoundary>
								</div>

								<div className="raccoon-max-w-[600px]">
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>Metrics</h2>
									<h4 className={`raccoon-text-raccoon-fg-3 raccoon-mb-4`}>Very basic anonymous usage tracking helps us keep void running smoothly. You may opt out below. Regardless of this setting, void never sees your code, messages, or API keys.</h4>

									<div className="raccoon-my-2">
										<ErrorBoundary>
											<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2 raccoon-my-2">
												<RaccoonSwitch
													size='xs'
													value={isOptedOut}
													onChange={(newVal) => {
														storageService.store(OPT_OUT_KEY, newVal, StorageScope.APPLICATION, StorageTarget.MACHINE);
														metricsService.capture(`Set metrics opt-out to ${newVal}`, {});
													}} />
												<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">{'Opt-out (requires restart)'}</span>
											</div>
										</ErrorBoundary>
									</div>
								</div>

								<div className="raccoon-max-w-[600px]">
									<h2 className={`raccoon-text-3xl raccoon-mb-2`}>AI Instructions</h2>
									<h4 className={`raccoon-text-raccoon-fg-3 raccoon-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
System instructions to include with all AI requests.
Alternatively, place a \`.raccoonrules\` file in the root of your workspace.
								`} chatMessageLocation={undefined} />
									</h4>
									<ErrorBoundary>
										<AIInstructionsBox />
									</ErrorBoundary>
									<div className="raccoon-my-4">
										<ErrorBoundary>
											<div className="raccoon-flex raccoon-items-center raccoon-gap-x-2">
												<RaccoonSwitch
													size='xs'
													value={!!settingsState.globalSettings.disableSystemMessage}
													onChange={(newValue) => {
														raccoonSettingsService.setGlobalSetting('disableSystemMessage', newValue);
													}} />
												<span className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-pointer-events-none">
													{'Disable system message'}
												</span>
											</div>
										</ErrorBoundary>
										<div className="raccoon-text-raccoon-fg-3 raccoon-text-xs raccoon-mt-1">
											{`When disabled, void will not include anything in the system message except for content you specified above.`}
										</div>
									</div>
								</div>
							</div>

							{/* MCP section */}
							<div className={shouldShowTab('mcp') ? `` : "raccoon-hidden"}>
								<ErrorBoundary>
									<h2 className="raccoon-text-3xl raccoon-mb-2">MCP</h2>
									<h4 className={`raccoon-text-raccoon-fg-3 raccoon-mb-4`}>
										<ChatMarkdownRender inPTag={true} string={`
Use Model Context Protocol to provide Agent mode with more tools.
							`} chatMessageLocation={undefined} />
									</h4>
									<div className="raccoon-my-2">
										<RaccoonButtonBgDarken className="raccoon-px-4 raccoon-py-1 raccoon-w-full raccoon-max-w-48" onClick={async () => { await mcpService.revealMCPConfigFile(); }}>
											Add MCP Server
										</RaccoonButtonBgDarken>
									</div>

									<ErrorBoundary>
										<MCPServersList />
									</ErrorBoundary>
								</ErrorBoundary>
							</div>

						</div>
					</div>
				</main>
			</div>
		</div>);
};
