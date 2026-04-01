/*---------------------------------------------------------------------------------------------
 * Raccoon AI — Bridge Service
 * Connects the desktop editor to the Raccoon web platform for real-time project sync
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';

export const raccoon_API_URL_KEY = 'raccoon.apiUrl';
export const raccoon_SESSION_TOKEN_KEY = 'raccoon.sessionToken';
export const raccoon_PROJECT_ID_KEY = 'raccoon.projectId';

export class RaccoonBridgeService extends Disposable {
  private socket: WebSocket | null = null;
  private _apiUrl: string = 'https://raccoon.ai';
  private _sessionToken: string = '';
  private _projectId: string = '';

  constructor(
    @IStorageService private readonly storageService: IStorageService,
    @INotificationService private readonly notificationService: INotificationService,
  ) {
    super();
    this._apiUrl = storageService.get(raccoon_API_URL_KEY, StorageScope.PROFILE, 'https://raccoon.ai');
    this._sessionToken = storageService.get(raccoon_SESSION_TOKEN_KEY, StorageScope.PROFILE, '');
    this._projectId = storageService.get(raccoon_PROJECT_ID_KEY, StorageScope.PROFILE, '');

    if (this._sessionToken && this._projectId) {
      this.connect();
    }
  }

  public connect(): void {
    const wsUrl = this._apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    try {
      this.socket = new WebSocket(`${wsUrl}/api/editor-sync?token=${this._sessionToken}&projectId=${this._projectId}`);
      this.socket.onopen = () => {
        this.notificationService.notify({ severity: Severity.Info, message: 'Raccoon AI: Connected to Raccoon platform' });
      };
      this.socket.onmessage = (event) => {
        this._handleMessage(JSON.parse(event.data));
      };
      this.socket.onclose = () => {
        this.notificationService.notify({ severity: Severity.Warning, message: 'Raccoon AI: Disconnected from platform' });
      };
    } catch (e) {
      console.error('[Raccoon Bridge] Connection error:', e);
    }
  }

  private _handleMessage(msg: { type: string; path?: string; content?: string }): void {
    // Handle incoming sync messages from Raccoon web
    switch (msg.type) {
      case 'ai_edit':
      case 'file_update':
        // Dispatch to file write service — wired up in the workbench contrib
        console.log('[Raccoon Bridge] Received:', msg.type, msg.path);
        break;
    }
  }

  public send(data: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  public setCredentials(token: string, projectId: string, apiUrl?: string): void {
    this._sessionToken = token;
    this._projectId = projectId;
    if (apiUrl) { this._apiUrl = apiUrl; }
    this.storageService.store(raccoon_SESSION_TOKEN_KEY, token, StorageScope.PROFILE, StorageTarget.USER);
    this.storageService.store(raccoon_PROJECT_ID_KEY, projectId, StorageScope.PROFILE, StorageTarget.USER);
    if (apiUrl) { this.storageService.store(raccoon_API_URL_KEY, apiUrl, StorageScope.PROFILE, StorageTarget.USER); }
    this.connect();
  }

  public override dispose(): void {
    if (this.socket) { this.socket.close(); }
    super.dispose();
  }
}
