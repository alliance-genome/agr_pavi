import { PayloadPart } from "../JobSubmitForm/types"

export interface UpdatePayloadPartFn {
    // eslint-disable-next-line no-unused-vars
    (index: number, value: PayloadPart): void
}
