#[cfg(test)]
mod tests {
    use crate::ID as PROGRAM_ID;
    use anchor_spl::{associated_token, token};
    use litesvm::LiteSVM;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    // Anchor discriminator = first 8 bytes of sha256("global:<instruction_name>")
    fn discriminator(name: &str) -> [u8; 8] {
        let preimage = format!("global:{}", name);
        let hash = solana_sdk::hash::hash(preimage.as_bytes());
        hash.to_bytes()[..8].try_into().unwrap()
    }

    fn get_mint_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"kad-mint"], &PROGRAM_ID)
    }

    fn get_mint_authority_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[b"mint-authority"], &PROGRAM_ID)
    }

    fn get_ata(wallet: &Pubkey, mint: &Pubkey) -> Pubkey {
        // Derive ATA manually: sha256("", wallet, mint, token_program) PDA
        // anchor-spl re-exports the crate so we can call through it.
        // Seeds: [wallet, token_program_id, mint]
        let (ata, _) = Pubkey::find_program_address(
            &[
                wallet.as_ref(),
                token::ID.as_ref(),
                mint.as_ref(),
            ],
            &associated_token::ID,
        );
        ata
    }

    fn create_initialize_ix(payer: &Pubkey) -> Instruction {
        let (mint, _) = get_mint_pda();
        let (mint_authority, _) = get_mint_authority_pda();

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*payer, true),
                AccountMeta::new(mint, false),
                AccountMeta::new_readonly(mint_authority, false),
                AccountMeta::new_readonly(token::ID, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator("initialize").to_vec(),
        }
    }

    fn create_complete_run_ix(
        runner: &Pubkey,
        runner_ata: &Pubkey,
        distance: u64,
        duration: u64,
    ) -> Instruction {
        let (mint, _) = get_mint_pda();
        let (mint_authority, _) = get_mint_authority_pda();

        let mut data = discriminator("complete_run").to_vec();
        data.extend_from_slice(&distance.to_le_bytes());
        data.extend_from_slice(&duration.to_le_bytes());

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*runner, true),
                AccountMeta::new(mint, false),
                AccountMeta::new(*runner_ata, false),
                AccountMeta::new_readonly(mint_authority, false),
                AccountMeta::new_readonly(token::ID, false),
                AccountMeta::new_readonly(associated_token::ID, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data,
        }
    }

    fn setup_svm() -> LiteSVM {
        let mut svm = LiteSVM::new();
        // Load the compiled kadence program
        let program_bytes = include_bytes!("../../../target/deploy/kadence.so");
        svm.add_program(PROGRAM_ID, program_bytes);
        svm
    }

    #[test]
    fn test_initialize_creates_mint() {
        let mut svm = setup_svm();
        let payer = Keypair::new();
        svm.airdrop(&payer.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let ix = create_initialize_ix(&payer.pubkey());
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), &[&payer], blockhash);

        let result = svm.send_transaction(tx);
        assert!(result.is_ok(), "initialize should succeed: {:?}", result.err());

        let (mint_pda, _) = get_mint_pda();
        let mint_account = svm.get_account(&mint_pda);
        assert!(mint_account.is_some(), "mint PDA should exist after initialize");
    }

    #[test]
    fn test_complete_run_mints_kad() {
        let mut svm = setup_svm();
        let runner = Keypair::new();
        svm.airdrop(&runner.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        // Initialize the mint first
        let init_ix = create_initialize_ix(&runner.pubkey());
        let blockhash = svm.latest_blockhash();
        let init_tx = Transaction::new_signed_with_payer(
            &[init_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );
        svm.send_transaction(init_tx).expect("initialize failed");

        // 5 km run in 30 minutes (360 sec/km — well above the 60 sec/km floor)
        let distance: u64 = 5_000; // metres
        let duration: u64 = 1_800; // seconds

        let (mint_pda, _) = get_mint_pda();
        let runner_ata = get_ata(&runner.pubkey(), &mint_pda);

        let run_ix = create_complete_run_ix(&runner.pubkey(), &runner_ata, distance, duration);
        let blockhash = svm.latest_blockhash();
        let run_tx = Transaction::new_signed_with_payer(
            &[run_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );

        let result = svm.send_transaction(run_tx);
        assert!(result.is_ok(), "complete_run should succeed: {:?}", result.err());

        // Expect 5 KAD = 5_000_000 base units (1 KAD per km, 6 decimals)
        let expected_reward: u64 = distance * 1_000;
        let ata_account = svm.get_account(&runner_ata).expect("ATA should exist");
        // Token account data: amount is at bytes 64..72
        let amount = u64::from_le_bytes(ata_account.data[64..72].try_into().unwrap());
        assert_eq!(amount, expected_reward, "runner should receive correct KAD reward");
    }

    #[test]
    fn test_complete_run_rejects_zero_distance() {
        let mut svm = setup_svm();
        let runner = Keypair::new();
        svm.airdrop(&runner.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let init_ix = create_initialize_ix(&runner.pubkey());
        let blockhash = svm.latest_blockhash();
        let init_tx = Transaction::new_signed_with_payer(
            &[init_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );
        svm.send_transaction(init_tx).expect("initialize failed");

        let (mint_pda, _) = get_mint_pda();
        let runner_ata = get_ata(&runner.pubkey(), &mint_pda);

        let run_ix = create_complete_run_ix(&runner.pubkey(), &runner_ata, 0, 600);
        let blockhash = svm.latest_blockhash();
        let run_tx = Transaction::new_signed_with_payer(
            &[run_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );

        let result = svm.send_transaction(run_tx);
        assert!(result.is_err(), "zero distance should be rejected");
    }

    #[test]
    fn test_complete_run_rejects_superhuman_pace() {
        let mut svm = setup_svm();
        let runner = Keypair::new();
        svm.airdrop(&runner.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let init_ix = create_initialize_ix(&runner.pubkey());
        let blockhash = svm.latest_blockhash();
        let init_tx = Transaction::new_signed_with_payer(
            &[init_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );
        svm.send_transaction(init_tx).expect("initialize failed");

        let (mint_pda, _) = get_mint_pda();
        let runner_ata = get_ata(&runner.pubkey(), &mint_pda);

        // 1 km in 30 seconds — way faster than the 60 sec/km floor
        let run_ix = create_complete_run_ix(&runner.pubkey(), &runner_ata, 1_000, 30);
        let blockhash = svm.latest_blockhash();
        let run_tx = Transaction::new_signed_with_payer(
            &[run_ix],
            Some(&runner.pubkey()),
            &[&runner],
            blockhash,
        );

        let result = svm.send_transaction(run_tx);
        assert!(result.is_err(), "superhuman pace should be rejected");
    }
}
