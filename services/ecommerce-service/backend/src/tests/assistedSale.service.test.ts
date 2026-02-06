/**
 * Assisted Sale Service Tests
 * Sprint 15 - Vente Assistée B2B
 * 
 * Tests obligatoires avec noms exacts :
 * 1. should_allow_comments_on_active_quote
 * 2. should_not_allow_editing_quote_snapshot
 * 3. should_allow_only_internal_role_to_extend_quote
 * 4. should_append_comment_on_extension
 * 5. should_preserve_comments_after_conversion
 */

import { SalesActorRole as PrismaSalesActorRole } from '@prisma/client';
import {
    AssistedSaleService,
    QuoteNotFoundForSaleError,
    QuoteAlreadyConvertedError,
    UnauthorizedRoleError,
    InvalidExtensionError
} from '../services/assistedSale.service';
import { QuoteCommentRepository } from '../repositories/quoteComment.repository';
import { QuoteAttachmentRepository } from '../repositories/quoteAttachment.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import { QuoteEntity } from '../domain/quote.types';

// Mock repositories
const mockCommentRepository = {
    create: jest.fn(),
    findByQuoteId: jest.fn()
};

const mockAttachmentRepository = {
    create: jest.fn(),
    findByQuoteId: jest.fn()
};

const mockQuoteRepository = {
    findById: jest.fn(),
    updateExpiresAt: jest.fn(),
    updateStatus: jest.fn()
};

// Mock quote - active, modifiable
const ACTIVE_QUOTE: QuoteEntity = {
    id: 'quote-1',
    companyId: 'company-1',
    customerRef: 'CUST-001',
    assetId: 'asset-1',
    ctoConfigurationId: 'cto-config-1',
    priceSnapshot: {
        components: [{ type: 'CPU', reference: 'XEON', quantity: 1, unitPrice: 500, lineTotal: 500 }],
        laborCost: 100,
        subtotal: 600,
        margin: 0.25,
        total: 750,
        currency: 'EUR',
        frozenAt: '2026-02-01'
    },
    leadTimeDays: 5,
    status: 'ACTIVE',
    expiresAt: new Date('2026-03-01'),
    convertedOrderId: null,
    createdAt: new Date()
};

// Mock quote - already converted
const CONVERTED_QUOTE: QuoteEntity = {
    ...ACTIVE_QUOTE,
    id: 'quote-converted',
    status: 'CONVERTED',
    convertedOrderId: 'order-123'
};

describe('AssistedSaleService', () => {
    let service: AssistedSaleService;

    beforeEach(() => {
        jest.clearAllMocks();

        service = new AssistedSaleService(
            mockCommentRepository as unknown as QuoteCommentRepository,
            mockAttachmentRepository as unknown as QuoteAttachmentRepository,
            mockQuoteRepository as unknown as QuoteRepository
        );
    });

    /**
     * TEST 1: should_allow_comments_on_active_quote
     * Vérifie qu'on peut ajouter des commentaires sur un devis ACTIVE
     */
    it('should_allow_comments_on_active_quote', async () => {
        // Arrange
        mockQuoteRepository.findById.mockResolvedValue(ACTIVE_QUOTE);
        mockCommentRepository.create.mockResolvedValue({
            id: 'comment-1',
            quoteId: ACTIVE_QUOTE.id,
            author: PrismaSalesActorRole.CLIENT,
            message: 'Besoin validation DSI',
            createdAt: new Date()
        });

        // Act
        const result = await service.addComment(
            ACTIVE_QUOTE.id,
            PrismaSalesActorRole.CLIENT,
            'Besoin validation DSI'
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.message).toBe('Besoin validation DSI');
        expect(mockCommentRepository.create).toHaveBeenCalledWith(
            ACTIVE_QUOTE.id,
            PrismaSalesActorRole.CLIENT,
            'Besoin validation DSI'
        );
    });

    /**
     * TEST 2: should_not_allow_editing_quote_snapshot
     * Vérifie qu'on NE PEUT PAS modifier un devis converti (= snapshot inviolable)
     */
    it('should_not_allow_editing_quote_snapshot', async () => {
        // Arrange - devis converti
        mockQuoteRepository.findById.mockResolvedValue(CONVERTED_QUOTE);

        // Act & Assert - Impossible d'ajouter un commentaire sur un devis converti
        await expect(
            service.addComment(
                CONVERTED_QUOTE.id,
                PrismaSalesActorRole.CLIENT,
                'Test message'
            )
        ).rejects.toThrow(QuoteAlreadyConvertedError);

        // Le commentaire n'a pas été créé
        expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    /**
     * TEST 3: should_allow_only_internal_role_to_extend_quote
     * Vérifie que seul SALES_INTERNAL peut prolonger un devis
     */
    it('should_allow_only_internal_role_to_extend_quote', async () => {
        // Arrange
        mockQuoteRepository.findById.mockResolvedValue(ACTIVE_QUOTE);
        const newDate = new Date('2026-04-01');

        // Act & Assert - CLIENT ne peut pas prolonger
        await expect(
            service.extendQuote(ACTIVE_QUOTE.id, PrismaSalesActorRole.CLIENT, newDate)
        ).rejects.toThrow(UnauthorizedRoleError);

        // Act & Assert - TECH_INTERNAL ne peut pas prolonger
        await expect(
            service.extendQuote(ACTIVE_QUOTE.id, PrismaSalesActorRole.TECH_INTERNAL, newDate)
        ).rejects.toThrow(UnauthorizedRoleError);

        // La date n'a pas été mise à jour
        expect(mockQuoteRepository.updateExpiresAt).not.toHaveBeenCalled();
    });

    /**
     * TEST 4: should_append_comment_on_extension
     * Vérifie qu'un commentaire automatique est ajouté lors de la prolongation
     */
    it('should_append_comment_on_extension', async () => {
        // Arrange
        mockQuoteRepository.findById.mockResolvedValue(ACTIVE_QUOTE);
        mockQuoteRepository.updateExpiresAt.mockResolvedValue({
            ...ACTIVE_QUOTE,
            expiresAt: new Date('2026-04-01')
        });
        mockCommentRepository.create.mockResolvedValue({
            id: 'comment-auto',
            quoteId: ACTIVE_QUOTE.id,
            author: PrismaSalesActorRole.SALES_INTERNAL,
            message: '📅 Devis prolongé',
            createdAt: new Date()
        });

        const newDate = new Date('2026-04-01');

        // Act
        const result = await service.extendQuote(
            ACTIVE_QUOTE.id,
            PrismaSalesActorRole.SALES_INTERNAL,
            newDate
        );

        // Assert
        expect(result.success).toBe(true);
        expect(mockQuoteRepository.updateExpiresAt).toHaveBeenCalledWith(
            ACTIVE_QUOTE.id,
            newDate
        );

        // Commentaire automatique ajouté
        expect(mockCommentRepository.create).toHaveBeenCalledWith(
            ACTIVE_QUOTE.id,
            PrismaSalesActorRole.SALES_INTERNAL,
            expect.stringContaining('📅 Devis prolongé')
        );
    });

    /**
     * TEST 5: should_preserve_comments_after_conversion
     * Vérifie que les commentaires restent lisibles après conversion
     */
    it('should_preserve_comments_after_conversion', async () => {
        // Arrange - devis converti avec des commentaires
        mockQuoteRepository.findById.mockResolvedValue(CONVERTED_QUOTE);
        mockCommentRepository.findByQuoteId.mockResolvedValue([
            {
                id: 'comment-1',
                quoteId: CONVERTED_QUOTE.id,
                author: PrismaSalesActorRole.CLIENT,
                message: 'Premier commentaire',
                createdAt: new Date('2026-02-01')
            },
            {
                id: 'comment-2',
                quoteId: CONVERTED_QUOTE.id,
                author: PrismaSalesActorRole.SALES_INTERNAL,
                message: 'Réponse commerciale',
                createdAt: new Date('2026-02-02')
            }
        ]);
        mockAttachmentRepository.findByQuoteId.mockResolvedValue([]);

        // Act - Récupérer la timeline d'un devis converti
        const timeline = await service.getTimeline(CONVERTED_QUOTE.id);

        // Assert - Les commentaires sont préservés et lisibles
        expect(timeline.items).toHaveLength(2);
        expect(timeline.items[0]?.data).toMatchObject({ message: 'Premier commentaire' });
        expect(timeline.items[1]?.data).toMatchObject({ message: 'Réponse commerciale' });
    });

    /**
     * TEST supplémentaire: Attachments réservés aux internes
     */
    it('should_only_allow_internal_roles_to_add_attachments', async () => {
        // Arrange
        mockQuoteRepository.findById.mockResolvedValue(ACTIVE_QUOTE);

        // Act & Assert - CLIENT ne peut pas ajouter de pièce jointe
        await expect(
            service.addAttachment(
                ACTIVE_QUOTE.id,
                PrismaSalesActorRole.CLIENT,
                'doc.pdf',
                'https://storage/doc.pdf'
            )
        ).rejects.toThrow(UnauthorizedRoleError);
    });

    /**
     * TEST supplémentaire: Extension date invalide
     */
    it('should_reject_extension_with_earlier_date', async () => {
        // Arrange
        mockQuoteRepository.findById.mockResolvedValue(ACTIVE_QUOTE);
        const earlierDate = new Date('2026-02-15'); // Avant l'expiration actuelle (2026-03-01)

        // Act & Assert
        await expect(
            service.extendQuote(
                ACTIVE_QUOTE.id,
                PrismaSalesActorRole.SALES_INTERNAL,
                earlierDate
            )
        ).rejects.toThrow(InvalidExtensionError);
    });
});
