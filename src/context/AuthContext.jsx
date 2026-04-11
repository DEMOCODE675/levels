import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { AuthContext } from './auth-context'
import { auth } from '../firebase/config'
import { logoutUser } from '../services/authService'
import { getProfile } from '../services/profileService'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!isMounted) {
                return
            }

            setUser(firebaseUser)

            if (!firebaseUser) {
                setProfile(null)
                setLoading(false)
                return
            }

            try {
                const existingProfile = await getProfile(firebaseUser.uid)
                if (isMounted) {
                    setProfile(existingProfile)
                }
            } catch (error) {
                if (isMounted) {
                    setProfile(null)
                }
                console.error('Failed to load profile:', error)
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        })

        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [])

    const refreshProfile = useCallback(
        async (userId = user?.uid) => {
            if (!userId) {
                setProfile(null)
                return null
            }

            const latestProfile = await getProfile(userId)
            setProfile(latestProfile)
            return latestProfile
        },
        [user?.uid],
    )

    const signOutCurrentUser = useCallback(async () => {
        await logoutUser()
        setProfile(null)
    }, [])

    const value = useMemo(
        () => ({
            user,
            profile,
            loading,
            refreshProfile,
            signOutCurrentUser,
        }),
        [loading, profile, refreshProfile, signOutCurrentUser, user],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
