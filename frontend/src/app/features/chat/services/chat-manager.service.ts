import { Injectable, signal } from '@angular/core';
import { FriendUser } from '../../friends/models/friend.model';

@Injectable({
  providedIn: 'root'
})
export class ChatManagerService {
  private _activeChats = signal<FriendUser[]>([]);
  public activeChats = this._activeChats.asReadonly();

  public openChat(user: FriendUser) {
    this._activeChats.update(chats => {
      // Nếu đã mở rồi thì không làm gì hoặc đẩy lên đầu (tuỳ logic, tạm thời không thay đổi thứ tự)
      if (chats.find(c => c.id === user.id)) {
        return chats;
      }
      
      const newChats = [...chats, user];
      // Tối đa 3 cửa sổ, xóa cửa sổ cũ nhất (phần tử đầu tiên)
      if (newChats.length > 3) {
        newChats.shift();
      }
      return newChats;
    });
  }

  public closeChat(userId: number) {
    this._activeChats.update(chats => chats.filter(c => c.id !== userId));
  }
}
