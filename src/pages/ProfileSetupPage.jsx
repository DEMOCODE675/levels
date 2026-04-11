import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { saveProfile, uploadProfilePhoto } from '../services/profileService'

function parseInterests(interestsInput) {
    return interestsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

export default function ProfileSetupPage() {
    const { user, profile, refreshProfile, signOutCurrentUser } = useAuth()
    const navigate = useNavigate()

    const [editing, setEditing] = useState(false)
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')
    const [interestsInput, setInterestsInput] = useState('')
    const [gender, setGender] = useState('female')
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (!profile) {
            return
        }

        setName(profile.name || '')
        setBio(profile.bio || '')
        setGender(profile.gender || 'female')
        setInterestsInput((profile.interests || []).join(', '))
        setPhotoPreview(profile.photoUrl || '')
    }, [profile])

    useEffect(() => {
        return () => {
            if (photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview)
            }
        }
    }, [photoPreview])

    const memberSinceLabel = useMemo(() => {
        if (!profile?.createdAt || typeof profile.createdAt.toDate !== 'function') {
            return 'New member'
        }

        return `Member since ${profile.createdAt.toDate().toLocaleDateString()}`
    }, [profile])

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        if (photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview)
        }

        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (!name.trim()) {
            setError('Please add your name.')
            return
        }

        if (!bio.trim()) {
            setError('Please add a short bio.')
            return
        }

        if (!user) {
            setError('You must be logged in to save profile data.')
            return
        }

        setBusy(true)

        try {
            let photoUrl = profile?.photoUrl || ''

            if (photoFile) {
                photoUrl = await uploadProfilePhoto(user.uid, photoFile)
            }

            await saveProfile(user.uid, {
                email: user.email,
                name: name.trim(),
                bio: bio.trim(),
                interests: parseInterests(interestsInput),
                gender,
                photoUrl,
                createdAt: profile?.createdAt,
            })

            await refreshProfile(user.uid)
            setPhotoFile(null)
            setEditing(false)
            setSuccess('Profile updated successfully.')
            notify.success('Profile updated.')
        } catch (profileError) {
            setError(profileError.message || 'Could not save profile. Try again.')
            notify.error(profileError.message || 'Could not save profile. Try again.')
        } finally {
            setBusy(false)
        }
    }

    const handleLogout = async () => {
        await signOutCurrentUser()
        navigate('/auth', { replace: true })
    }

    return (
        <AppShell title="Profile" subtitle="Manage your profile details">
            <section className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="grid gap-5 md:grid-cols-[280px,1fr]">
                    <aside>
                        <img
                            src={photoPreview || 'https://placehold.co/500x680?text=Profile+Photo'}
                            alt="Profile preview"
                            className="h-80 w-full rounded-2xl border border-gray-200 object-cover"
                        />
                        <p className="mt-3 text-sm text-gray-500">{memberSinceLabel}</p>
                    </aside>

                    <div>
                        {!editing ? (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{profile?.name || 'Your name'}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-gray-500">{profile?.bio || 'No bio added yet.'}</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {(profile?.interests || []).length === 0 ? (
                                        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">
                                            No interests added
                                        </span>
                                    ) : (
                                        (profile?.interests || []).map((interest) => (
                                            <span
                                                key={interest}
                                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-[#7a1f2b]"
                                            >
                                                {interest}
                                            </span>
                                        ))
                                    )}
                                </div>

                                <p className="mt-4 text-sm font-medium text-gray-700">Gender: {profile?.gender || 'Not set'}</p>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(true)
                                            setError('')
                                            setSuccess('')
                                        }}
                                        className="rounded-xl bg-[#7a1f2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#651924]"
                                    >
                                        Edit Profile
                                    </button>

                                    <Link
                                        to="/settings"
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Safety Settings
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-gray-700">Name</span>
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Your name"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-gray-700">Bio</span>
                                    <textarea
                                        value={bio}
                                        onChange={(event) => setBio(event.target.value)}
                                        rows={4}
                                        placeholder="Tell people about yourself"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-gray-700">Interests (comma separated)</span>
                                    <input
                                        value={interestsInput}
                                        onChange={(event) => setInterestsInput(event.target.value)}
                                        placeholder="music, coding, football"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                    />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-gray-700">Gender</span>
                                        <select
                                            value={gender}
                                            onChange={(event) => setGender(event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                        >
                                            <option value="female">Female</option>
                                            <option value="male">Male</option>
                                            <option value="non-binary">Non-binary</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-gray-700">Profile Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#7a1f2b] focus:ring-2 focus:ring-rose-100"
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={busy}
                                        className="rounded-xl bg-[#7a1f2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#651924] disabled:cursor-not-allowed disabled:bg-[#b6808a]"
                                    >
                                        {busy ? 'Saving...' : 'Save Profile'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        {error ? (
                            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                {error}
                            </p>
                        ) : null}

                        {success ? (
                            <p className="mt-4 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-[#7a1f2b]">
                                {success}
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>
        </AppShell>
    )
}
