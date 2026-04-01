/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { raccoonCheckUpdateRespose } from './raccoonUpdateServiceTypes.js';



export interface IRaccoonUpdateService {
	readonly _serviceBrand: undefined;
	check: (explicit: boolean) => Promise<raccoonCheckUpdateRespose>;
}


export const IRaccoonUpdateService = createDecorator<IRaccoonUpdateService>('raccoonUpdateService');


// implemented by calling channel
export class RaccoonUpdateService implements IRaccoonUpdateService {

	readonly _serviceBrand: undefined;
	private readonly raccoonUpdateService: IRaccoonUpdateService;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService, // (only usable on client side)
	) {
		// creates an IPC proxy to use metricsMainService.ts
		this.raccoonUpdateService = ProxyChannel.toService<IRaccoonUpdateService>(mainProcessService.getChannel('raccoon-channel-update'));
	}


	// anything transmitted over a channel must be async even if it looks like it doesn't have to be
	check: IRaccoonUpdateService['check'] = async (explicit) => {
		const res = await this.raccoonUpdateService.check(explicit)
		return res
	}
}

registerSingleton(IRaccoonUpdateService, RaccoonUpdateService, InstantiationType.Eager);


