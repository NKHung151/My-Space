import { Pipe, PipeTransform } from '@angular/core';

type NamedUser = { displayName?: string | null; username?: string | null } | null | undefined;

/** Tên hiển thị của người dùng: displayName, không có thì username. */
export function displayNameOf(user: NamedUser, fallback = ''): string {
  return user?.displayName?.trim() || user?.username || fallback;
}

/** Dùng trong template: {{ user | displayName }} hoặc {{ user | displayName: 'Người dùng' }} */
@Pipe({
  name: 'displayName',
  standalone: true,
})
export class DisplayNamePipe implements PipeTransform {
  transform(user: NamedUser, fallback = ''): string {
    return displayNameOf(user, fallback);
  }
}
