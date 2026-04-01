/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

export const defaultProviderSettings = {
	anthropic: {
		apiKey: '',
	},
	openAI: {
		apiKey: '',
	},
	deepseek: {
		apiKey: '',
	},
	ollama: {
		endpoint: 'http://127.0.0.1:11434',
	},
	vLLM: {
		endpoint: 'http://localhost:8000',
	},
	openRouter: {
		apiKey: '',
	},
	openAICompatible: {
		endpoint: '',
		apiKey: '',
		headersJSON: '{}', // default to {}
	},
	gemini: {
		apiKey: '',
	},
	groq: {
		apiKey: '',
	},
	xAI: {
		apiKey: '',
	},
	mistral: {
		apiKey: '',
	},
	lmStudio: {
		endpoint: 'http://localhost:1234',
	},
	liteLLM: { // https://docs.litellm.ai/docs/providers/openai_compatible
		endpoint: '',
	},
	googleVertex: { // google https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library
		region: 'us-west2',
		project: '',
	},
	microsoftAzure: { // microsoft Azure Foundry
		project: '', // really 'resource'
		apiKey: '',
		azureApiVersion: '2024-05-01-preview',
	},
	awsBedrock: {
		apiKey: '',
		region: 'us-east-1', // add region setting
		endpoint: '', // optionally allow overriding default
	},

} as const

export type ProviderName = keyof typeof defaultProviderSettings
export const providerNames = Object.keys(defaultProviderSettings) as ProviderName[]

export const defaultModelsOfProvider = {
	openAI: [ // https://platform.openai.com/docs/models/gp
		'gpt-4.1',
		'gpt-4.1-mini',
		'gpt-4.1-nano',
		'o3',
		'o4-mini',
		'o1',
		'o3-mini',
		'gpt-4o',
		'gpt-4o-mini',
	],
	anthropic: [ // https://docs.anthropic.com/en/docs/about-claude/models
		'claude-opus-4-0',
		'claude-sonnet-4-0',
		'claude-3-7-sonnet-latest',
		'claude-3-5-sonnet-latest',
		'claude-3-5-haiku-latest',
		'claude-3-opus-latest',
	],
	xAI: [ // https://docs.x.ai/docs/models?cluster=us-east-1
		'grok-2',
		'grok-3',
		'grok-3-mini',
		'grok-3-fast',
		'grok-3-mini-fast'
	],
	gemini: [ // https://ai.google.dev/gemini-api/docs/models/gemini
		'gemini-3.1-pro-preview',
		'gemini-3-flash-preview',
		'gemini-3.1-flash-lite-preview',
		'gemini-2.5-pro',
		'gemini-2.5-flash',
		'gemini-2.0-flash',
		'gemini-2.0-pro-exp-02-05',

	],
	deepseek: [ // https://api-docs.deepseek.com/quick_start/pricing
		'deepseek-chat',
		'deepseek-reasoner',
	],
	ollama: [ // autodetected
	],
	vLLM: [ // autodetected
	],
	lmStudio: [], // autodetected

	openRouter: [ // https://openrouter.ai/models
		'anthropic/claude-opus-4',
		'anthropic/claude-sonnet-4',
		'qwen/qwen3-235b-a22b',
		'anthropic/claude-3.7-sonnet',
		'anthropic/claude-3.5-sonnet',
		'qwen/qwen-2.5-coder-32b-instruct',
		'deepseek/deepseek-r1',
		'deepseek/deepseek-r1-zero:free',
		'mistralai/devstral-small:free'
	],
	groq: [ // https://console.groq.com/docs/models
		'qwen-qwq-32b',
		'llama-3.3-70b-versatile',
		'llama-3.1-8b-instant',
		// 'qwen-2.5-coder-32b', // preview mode (experimental)
	],
	mistral: [ // https://docs.mistral.ai/getting-started/models/models_overview/
		'codestral-latest',
		'devstral-small-latest',
		'mistral-large-latest',
		'mistral-medium-latest',
		'ministral-3b-latest',
		'ministral-8b-latest',
	],
	openAICompatible: [], // fallback
	googleVertex: [],
	microsoftAzure: [],
	awsBedrock: [],
	liteLLM: [],

} as const satisfies Record<ProviderName, readonly string[]>
