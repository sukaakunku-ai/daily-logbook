import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    collection,
    query,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, firebaseConfig } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserAccount {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'user';
    permissions: string[];
    created_at: string;
}

export function useUsers() {
    const { user, isAdmin } = useAuth();
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            if (!isAdmin) return [];
            const q = query(collection(db, 'users'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: (doc.data().created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            })) as UserAccount[];
        },
        enabled: isAdmin,
    });

    const createUser = useMutation({
        mutationFn: async ({ email, password, fullName, role = 'user', permissions = [] }: { email: string; password: string; fullName: string; role?: 'admin' | 'user'; permissions?: string[] }) => {
            // Initialize a secondary Firebase instance to create the user without signing out the current admin
            const secondaryAppName = `Secondary-${Date.now()}`;
            const secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const newUid = userCredential.user.uid;

                await updateProfile(userCredential.user, {
                    displayName: fullName,
                });

                // Create user profile in Firestore
                await setDoc(doc(db, 'users', newUid), {
                    email,
                    fullName,
                    role,
                    permissions,
                    created_at: serverTimestamp(),
                });

                // Sign out secondary auth to be safe
                await secondaryAuth.signOut();

                return { id: newUid };
            } catch (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User created successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to create user: ' + error.message);
        },
    });

    const updatePermissions = useMutation({
        mutationFn: async ({ userId, permissions }: { userId: string; permissions: string[] }) => {
            const docRef = doc(db, 'users', userId);
            await updateDoc(docRef, {
                permissions,
                updated_at: serverTimestamp(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Permissions updated successfully');
        },
    });

    return {
        users: usersQuery.data ?? [],
        isLoading: usersQuery.isLoading,
        createUser,
        updatePermissions,
    };
}
