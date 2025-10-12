import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Settings, User as UserIcon, LogOut } from 'lucide-react';

export default function UserSettings() {
    const [user, setUser] = useState(null);

    // Effect for fetching user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error("No user logged in", error);
            }
        };
        fetchUser();
    }, []);

    // Force light mode always - override system dark mode
    useEffect(() => {
        // Remove any dark class and force light mode
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        // Remove any stored theme preference that might enable dark mode
        localStorage.removeItem('theme');
    }, []);

    const handleLogout = async () => {
        try {
            await User.logout();
            window.location.reload(); // Force a reload to go to login page
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5 text-slate-600" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {user ? (
                    <>
                        <DropdownMenuLabel>
                            <p className="font-semibold">{user.full_name}</p>
                            <p className="text-xs text-slate-500 font-normal">{user.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                ) : (
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                )}
                <DropdownMenuItem disabled>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}