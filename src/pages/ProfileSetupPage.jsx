import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'
import { notify } from '../lib/notify'
import { saveProfile, uploadProfilePhoto } from '../services/profileService'

const MAX_PROFILE_PHOTO_SIZE_BYTES = 8 * 1024 * 1024

function parseInterests(interestsInput) {
    return interestsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

export default function ProfileSetupPage() {
    const { user, profile, refreshProfile, signOutCurrentUser } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const [editing, setEditing] = useState(true)
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')
    const [interestsInput, setInterestsInput] = useState('')
    const [gender, setGender] = useState('female')
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState('')
    const [draggingPhoto, setDraggingPhoto] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const fileInputRef = useRef(null)

    const editModeRequested = useMemo(
        () => new URLSearchParams(location.search).get('edit') === '1',
        [location.search],
    )
    const hasSavedPhoto = Boolean(profile?.photoUrl)
    const hasAnyPhoto = Boolean(photoFile || hasSavedPhoto)

    useEffect(() => {
        if (!profile) {
            setEditing(true)
            return
        }

        setName(profile.name || '')
        setBio(profile.bio || '')
        setGender(profile.gender || 'female')
        setInterestsInput((profile.interests || []).join(', '))
        setPhotoPreview(profile.photoUrl || '')
        setEditing(editModeRequested || !Boolean(profile.photoUrl))
    }, [editModeRequested, profile])

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

    const applyPhotoFile = (file) => {
        if (!file) {
            return
        }

        if (!file.type?.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, WEBP).')
            return
        }

        if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
            setError('Profile photo must be smaller than 8 MB.')
            return
        }

        if (photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview)
        }

        setDraggingPhoto(false)
        setError('')
        setSuccess('')
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    const handlePhotoChange = (event) => {
        const file = event.target.files?.[0]
        applyPhotoFile(file)
    }

    const handlePhotoDragOver = (event) => {
        event.preventDefault()
        setDraggingPhoto(true)
    }

    const handlePhotoDragLeave = (event) => {
        event.preventDefault()
        if (event.currentTarget.contains(event.relatedTarget)) {
            return
        }

        setDraggingPhoto(false)
    }

    const handlePhotoDrop = (event) => {
        event.preventDefault()
        setDraggingPhoto(false)
        const file = event.dataTransfer?.files?.[0]
        applyPhotoFile(file)
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

        if (!hasAnyPhoto) {
            setError('Profile photo is required before continuing.')
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
            setSuccess('Profile updated successfully.')
            notify.success('Profile updated.')
            navigate('/', { replace: true })
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
                        <div className="aspect-9/16 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 sm:aspect-3/4">
                            <img
                                src={photoPreview || 'https://placehold.co/500x680?text=Profile+Photo'}
                                alt="Profile preview"
                                className="h-full w-full object-cover"
                            />
                        </div>
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

                                    <div className="block">
                                        <span className="mb-2 block text-sm font-medium text-gray-700">Profile Photo</span>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />

                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => fileInputRef.current?.click()}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    fileInputRef.current?.click()
                                                }
                                            }}
                                            onDragOver={handlePhotoDragOver}
                                            onDragLeave={handlePhotoDragLeave}
                                            onDrop={handlePhotoDrop}
                                            className={`flex min-h-27 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-3 text-center transition ${draggingPhoto
                                                ? 'border-[#7a1f2b] bg-rose-50'
                                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-gray-700">Drag and drop image here</p>
                                            <p className="mt-1 text-xs text-gray-500">or tap to browse files</p>
                                            <p className="mt-2 text-[11px] text-gray-500">JPG, PNG, WEBP up to 8 MB</p>
                                        </div>
                                    </div>
                                </div>

                                {!hasAnyPhoto ? (
                                    <p className="text-xs font-medium text-[#7a1f2b]">
                                        Add a profile photo to continue.
                                    </p>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={busy || !hasAnyPhoto}
                                        className="rounded-xl bg-[#7a1f2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#651924] disabled:cursor-not-allowed disabled:bg-[#b6808a]"
                                    >
                                        {busy ? 'Saving...' : 'Save Profile'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!hasSavedPhoto) {
                                                setError('Add a profile photo and save before leaving edit mode.')
                                                return
                                            }

                                            setEditing(false)
                                        }}
                                        disabled={!hasSavedPhoto}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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
