import mongoose, { Schema, type Document } from 'mongoose';

/**
 * User interface — wallet-first identity.
 * No email or password: authentication is via Solana wallet signature.
 */
export interface IUser {
    walletAddress: string;
    username?: string;
    avatar?: string;
    createdAt: Date;
    lastLoginAt?: Date;
}

export interface IUserDocument extends IUser, Document { }

const userSchema = new Schema<IUserDocument>(
    {
        walletAddress: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        username: {
            type: String,
            trim: true,
            default: undefined,
        },
        avatar: {
            type: String,
            trim: true,
            default: undefined,
        },
        lastLoginAt: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            transform(_doc, ret: Record<string, any>) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
